import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors } from "@/lib/cors";
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

function canManage(
  actor: ReturnType<typeof getActor>,
  row: { empresa_id: number | null }
) {
  if (actor.tipo === "admin") return true;
  if (actor.tipo === "empresa" && actor.usuario) {
    return row.empresa_id === actor.usuario.id;
  }
  return false;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }), "GET, PUT, DELETE, OPTIONS");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);

  const row = db
    .prepare(`${SELECT_BASE} WHERE p.id = ?`)
    .get(Number(id)) as unknown as PedidoConRepartidor | undefined;
  if (!row) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, row)) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }
  return withCors(NextResponse.json(row));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);

  const current = db
    .prepare("SELECT id, empresa_id, estado, repartidor_id, direccion_entrega FROM pedidos WHERE id = ?")
    .get(Number(id)) as
    | {
      id: number;
      empresa_id: number | null;
      estado: string;
      repartidor_id: number | null;
      direccion_entrega: string;
    }
    | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, current)) {
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

  // Validar que el repartidor exista si se proporciona. Como los repartidores son
  // externos, no se valida pertenencia a una empresa concreta.
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

  const empresaId = current.empresa_id;
  const empresaRow = empresaId
    ? (db.prepare("SELECT nombre FROM usuarios WHERE id = ?").get(empresaId) as
        | { nombre: string }
        | undefined)
    : undefined;
  const empresaNombre = empresaRow?.nombre ?? "";

  // Si la dirección de entrega cambió, re-geocodificamos para que el pin del
  // minimapa se mueva a la nueva ubicación. Si la geocodificación falla,
  // mantenemos las coordenadas previas.
  let lat: number | undefined;
  let lng: number | undefined;
  if (direccion_entrega !== current.direccion_entrega) {
    const geo = await geocodeAddress(direccion_entrega);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const setCols = [
    "empresa_id = ?",
    "empresa = ?",
    "direccion_entrega = ?",
    "observaciones = ?",
    "estado = ?",
    "repartidor_id = ?",
  ];
  const setVals: (string | number | null)[] = [
    empresaId,
    empresaNombre,
    direccion_entrega,
    observaciones,
    estado,
    repartidor_id,
  ];
  if (lat !== undefined && lng !== undefined) {
    setCols.push("lat = ?", "lng = ?");
    setVals.push(lat, lng);
  }
  setCols.push("actualizado_en = datetime('now')");

  const result = db
    .prepare(`UPDATE pedidos SET ${setCols.join(", ")} WHERE id = ?`)
    .run(...setVals, Number(id));

  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const row = db
    .prepare(`${SELECT_BASE} WHERE p.id = ?`)
    .get(Number(id)) as unknown as PedidoConRepartidor;

  // Notificación por Telegram:
  // - Si pasa a pendiente y no hay repartidor, broadcast a disponibles.
  // - Si se asigna a un repartidor (nuevo o distinto al anterior), avísale.
  // - Si se quita un repartidor asignado, se considera reasignación.
  const prevRep = current.repartidor_id ?? null;
  const newRep = row.repartidor_id ?? null;
  const prevEstado = current.estado ?? null;
  const newEstado = row.estado;
  const broadcast =
    newEstado === "pendiente" && newRep == null;
  const asignoNuevoRepartidor = newRep != null && newRep !== prevRep;

  if (broadcast) {
    const msg = `🆕 Pedido disponible <b>${row.codigo}</b>\n${row.empresa}\n📍 Recojo: ${row.direccion_recojo}\n🏠 Entrega: ${row.direccion_entrega}`;
    // Repartidores externos: broadcast a todos los disponibles.
    await notificarRepartidoresDisponibles(db, msg);
  } else if (asignoNuevoRepartidor && (prevEstado !== newEstado || prevRep == null)) {
    const msg = `📋 Se te asignó el pedido <b>${row.codigo}</b>\n📍 Recojo: ${row.direccion_recojo}\n🏠 Entrega: ${row.direccion_entrega}`;
    await notificarRepartidor(db, newRep, msg);
  }

  return withCors(NextResponse.json(row));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);

  const current = db
    .prepare(
      "SELECT p.id, p.empresa_id, p.codigo, p.repartidor_id FROM pedidos p WHERE p.id = ?"
    )
    .get(Number(id)) as
    | { id: number; empresa_id: number | null; codigo: string; repartidor_id: number | null }
    | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, current)) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const result = db.prepare("DELETE FROM pedidos WHERE id = ?").run(Number(id));
  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  if (current.repartidor_id != null) {
    await notificarRepartidor(
      db,
      current.repartidor_id,
      `❌ El pedido <b>${current.codigo}</b> fue cancelado.`
    );
  }

  return withCors(NextResponse.json({ ok: true }));
}
