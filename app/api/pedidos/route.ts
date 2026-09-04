import { NextRequest, NextResponse } from "next/server";
import type { SQLInputValue } from "node:sqlite";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor } from "@/lib/auth";
import { PedidoConRepartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT_BASE = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

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
  const codigo = String(body.codigo ?? "").trim();
  const direccion_recojo = String(body.direccion_recojo ?? "").trim();
  const direccion_entrega = String(body.direccion_entrega ?? "").trim();
  const observaciones = body.observaciones ? String(body.observaciones).trim() : null;
  const estado = String(body.estado ?? "pendiente");
  const repartidor_id = body.repartidor_id ? Number(body.repartidor_id) : null;
  const lat = Number(body.lat ?? -13.0833);
  const lng = Number(body.lng ?? -76.3833);

  if (!codigo || !direccion_recojo || !direccion_entrega) {
    return withCors(
      NextResponse.json(
        { error: "Código, dirección de recojo y dirección de entrega son obligatorios" },
        { status: 400 }
      )
    );
  }

  // Determinar empresa: para empresa, siempre la suya; para admin, opcional vía body.
  let empresaId: number | null = null;
  let empresaNombre = "";
  if (actor.tipo === "empresa" && actor.usuario) {
    empresaId = actor.usuario.id;
    empresaNombre = actor.usuario.nombre;
  } else if (actor.tipo === "admin") {
    empresaId = body.empresa_id ? Number(body.empresa_id) : null;
    empresaNombre = String(body.empresa ?? "").trim();
    if (empresaId) {
      const emp = db
        .prepare("SELECT nombre FROM usuarios WHERE id = ? AND rol_id = 2")
        .get(empresaId) as { nombre: string } | undefined;
      if (!emp) {
        return withCors(
          NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
        );
      }
      empresaNombre = empresaNombre || emp.nombre;
    }
  }

  if (!empresaNombre) {
    return withCors(
      NextResponse.json({ error: "Debes indicar la empresa del pedido" }, { status: 400 })
    );
  }

  // Si empresa asigna un repartidor, validar que sea de su misma empresa.
  if (repartidor_id !== null) {
    const rep = db
      .prepare("SELECT empresa_id FROM repartidores WHERE id = ?")
      .get(repartidor_id) as { empresa_id: number | null } | undefined;
    if (!rep) {
      return withCors(
        NextResponse.json({ error: "Repartidor no encontrado" }, { status: 400 })
      );
    }
    if (actor.tipo === "empresa" && rep.empresa_id !== actor.usuario!.id) {
      return withCors(
        NextResponse.json({ error: "Repartidor no pertenece a tu empresa" }, { status: 403 })
      );
    }
  }

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
  return withCors(NextResponse.json(row, { status: 201 }));
}
