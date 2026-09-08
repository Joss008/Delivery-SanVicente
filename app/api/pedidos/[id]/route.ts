import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors } from "@/lib/cors";
import { getActor } from "@/lib/auth";
import { notificarRepartidor, notificarRepartidoresDisponibles } from "@/lib/telegram";
import { geocodeAddress } from "@/lib/geocode";
import { PedidoConRepartidor, PedidoDetalle } from "@/lib/types";
import { eventosDePedido } from "@/lib/antifraude";

export const dynamic = "force-dynamic";

const SELECT_BASE = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

const SELECT_PARA_REPARTIDOR = `
  SELECT
    p.id, p.codigo, p.empresa, p.empresa_id, p.direccion_recojo,
    p.direccion_entrega, p.observaciones, p.estado, p.repartidor_id,
    p.lat, p.lng, p.creado_en, p.actualizado_en,
    NULL AS otp_codigo, NULL AS otp_expira_en,
    p.otp_intentos, p.otp_validado_en, p.otp_validado_por,
    p.entrega_lat, p.entrega_lng, p.aceptado_en,
    p.reclamado_en, p.reclamado_por, p.reclamo_motivo,
    p.alerta_distancia_km, p.alerta_tiempo_seg, p.alerta_motivo,
    r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

function canManage(
  actor: ReturnType<typeof getActor>,
  row: { empresa_id: number | null; repartidor_id: number | null }
) {
  if (actor.tipo === "admin") return true;
  if (actor.tipo === "empresa" && actor.usuario) {
    return row.empresa_id === actor.usuario.id;
  }
  if (actor.tipo === "repartidor" && actor.repartidor) {
    // El repartidor puede ver un pedido si está asignado a él O si está
    // pendiente (cualquiera puede aceptarlo). El OTP nunca se devuelve.
    return row.repartidor_id === actor.repartidor.id || row.repartidor_id == null;
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

  const isRepartidor = actor.tipo === "repartidor";
  const stmt = db.prepare(
    `${isRepartidor ? SELECT_PARA_REPARTIDOR : SELECT_BASE} WHERE p.id = ?`
  );
  const row = stmt.get(Number(id)) as unknown as PedidoConRepartidor | undefined;
  if (!row) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, row)) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  // Sólo admin y la empresa dueña ven el historial de eventos del pedido.
  const eventos =
    actor.tipo === "admin" ||
    (actor.tipo === "empresa" && actor.usuario?.id === row.empresa_id)
      ? eventosDePedido(db, row.id)
      : [];

  const detalle: PedidoDetalle = { ...row, eventos };
  return withCors(NextResponse.json(detalle));
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
