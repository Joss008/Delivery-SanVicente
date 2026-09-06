import { NextRequest, NextResponse } from "next/server";
import type { SQLInputValue } from "node:sqlite";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor } from "@/lib/auth";
import { notificarRepartidor, notificarRepartidoresDisponibles } from "@/lib/telegram";
import { geocodeAddress } from "@/lib/geocode";
import { PedidoConRepartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT_BASE = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

const CODIGO_BASE = 1000;

function generarCodigoPedido(db: ReturnType<typeof getDb>): string {
  // Encuentra el siguiente correlativo a partir del mayor número contenido en
  // cualquier código con formato `PED-N` ya existente. Si la BD está vacía (o
  // sólo tiene códigos con números < CODIGO_BASE), empieza en PED-1001.
  const rows = db
    .prepare("SELECT codigo FROM pedidos WHERE codigo LIKE 'PED-%'")
    .all() as { codigo: string }[];
  let max = 0;
  for (const r of rows) {
    const match = /PED-(\d+)/.exec(r.codigo);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  const next = max >= CODIGO_BASE ? max + 1 : CODIGO_BASE + 1;
  return `PED-${next}`;
}

function authFilter(actor: ReturnType<typeof getActor>) {
  if (actor.tipo === "admin") {
    return { where: "", params: [] as SQLInputValue[] };
  }
  if (actor.tipo === "empresa" && actor.usuario) {
    return {
      where: "WHERE p.empresa_id = ?",
      params: [actor.usuario.id] as SQLInputValue[],
    };
  }
  return { where: "", params: [] as SQLInputValue[] };
}

export async function OPTIONS() {
  return corsPreflight("GET, POST, OPTIONS");
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);
  const filter = authFilter(actor);

  const rows = (
    filter.params.length
      ? db.prepare(`${SELECT_BASE} ${filter.where} ORDER BY p.id DESC`).all(...filter.params)
      : db.prepare(`${SELECT_BASE} ORDER BY p.id DESC`).all()
  ) as unknown as PedidoConRepartidor[];
  return withCors(NextResponse.json(rows));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);

  if (actor.tipo !== "admin" && actor.tipo !== "empresa") {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const body = await req.json();
  const direccion_entrega = String(body.direccion_entrega ?? "").trim();
  const observaciones = body.observaciones ? String(body.observaciones).trim() : null;
  const estado = String(body.estado ?? "pendiente");
  const repartidor_id = body.repartidor_id ? Number(body.repartidor_id) : null;

  if (!direccion_entrega) {
    return withCors(
      NextResponse.json(
        { error: "La dirección de entrega es obligatoria" },
        { status: 400 }
      )
    );
  }

  // Determinar empresa: para empresa, siempre la suya; para admin, opcional vía body.
  let empresaId: number | null = null;
  let empresaNombre = "";
  let empresaDireccion: string | null = null;
  if (actor.tipo === "empresa" && actor.usuario) {
    empresaId = actor.usuario.id;
    empresaNombre = actor.usuario.nombre;
    empresaDireccion = (actor.usuario.direccion ?? "").trim() || null;
  } else if (actor.tipo === "admin") {
    empresaId = body.empresa_id ? Number(body.empresa_id) : null;
    empresaNombre = String(body.empresa ?? "").trim();
    if (empresaId) {
      const emp = db
        .prepare("SELECT nombre, direccion FROM usuarios WHERE id = ? AND rol_id = 2")
        .get(empresaId) as { nombre: string; direccion: string | null } | undefined;
      if (!emp) {
        return withCors(
          NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
        );
      }
      empresaNombre = empresaNombre || emp.nombre;
      empresaDireccion = (emp.direccion ?? "").trim() || null;
    }
  }

  if (!empresaNombre) {
    return withCors(
      NextResponse.json({ error: "Debes indicar la empresa del pedido" }, { status: 400 })
    );
  }

  if (!empresaDireccion) {
    return withCors(
      NextResponse.json(
        {
          error:
            "La empresa aún no tiene una dirección de local configurada. Edita el perfil de la empresa para registrarla antes de crear pedidos.",
        },
        { status: 400 }
      )
    );
  }

  // Si se asigna un repartidor, validar que exista. Como los repartidores son
  // externos (no pertenecen a una empresa concreta), no se aplica la validación
  // de pertenencia previa.
  if (repartidor_id !== null) {
    const rep = db
      .prepare("SELECT id FROM repartidores WHERE id = ?")
      .get(repartidor_id) as { id: number } | undefined;
    if (!rep) {
      return withCors(
        NextResponse.json({ error: "Repartidor no encontrado" }, { status: 400 })
      );
    }
  }

  const codigo = generarCodigoPedido(db);
  const direccion_recojo = empresaDireccion;

  // Geocodificamos la dirección de entrega para que aparezca como un punto
  // fijo en el minimapa del panel. Si Nominatim no devuelve nada, guardamos
  // el pedido igual con coordenadas neutras: simplemente no tendrá pin.
  const geo = await geocodeAddress(direccion_entrega);
  const lat = geo?.lat ?? -13.0833;
  const lng = geo?.lng ?? -76.3833;

  const result = db
    .prepare(
      `INSERT INTO pedidos (codigo, empresa_id, empresa, direccion_recojo, direccion_entrega, observaciones, estado, repartidor_id, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      codigo,
      empresaId,
      empresaNombre,
      direccion_recojo,
      direccion_entrega,
      observaciones,
      estado,
      repartidor_id,
      lat,
      lng
    );

  const row = db
    .prepare(`${SELECT_BASE} WHERE p.id = ?`)
    .get(Number(result.lastInsertRowid)) as unknown as PedidoConRepartidor;

  // Notificación por Telegram: si el pedido se crea ya asignado, avisa al
  // repartidor; si queda pendiente, hace broadcast a los disponibles.
  const msg = `🆕 Nuevo pedido <b>${row.codigo}</b>\n${row.empresa}\n📍 Recojo: ${row.direccion_recojo}\n🏠 Entrega: ${row.direccion_entrega}`;
  if (row.estado === "pendiente" && row.repartidor_id == null) {
    // Repartidores externos: broadcast a todos los disponibles.
    await notificarRepartidoresDisponibles(db, msg);
  } else if (row.repartidor_id != null) {
    await notificarRepartidor(db, row.repartidor_id, msg);
  }

  return withCors(NextResponse.json(row, { status: 201 }));
}
