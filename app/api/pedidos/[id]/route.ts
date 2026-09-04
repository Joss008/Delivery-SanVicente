import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors } from "@/lib/cors";
import { getActor } from "@/lib/auth";
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
    .prepare("SELECT id, empresa_id FROM pedidos WHERE id = ?")
    .get(Number(id)) as { id: number; empresa_id: number | null } | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, current)) {
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

  // Validar repartidor de la misma empresa (si se proporciona)
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

  const empresaId = current.empresa_id;
  const empresaRow = empresaId
    ? (db.prepare("SELECT nombre FROM usuarios WHERE id = ?").get(empresaId) as
        | { nombre: string }
        | undefined)
    : undefined;
  const empresaNombre = empresaRow?.nombre ?? "";

  const result = db
    .prepare(
      `UPDATE pedidos
       SET codigo = ?, empresa_id = ?, empresa = ?, direccion_recojo = ?, direccion_entrega = ?, observaciones = ?, estado = ?, repartidor_id = ?, lat = ?, lng = ?, actualizado_en = datetime('now')
       WHERE id = ?`
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
      lng,
      Number(id)
    );

  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const row = db
    .prepare(`${SELECT_BASE} WHERE p.id = ?`)
    .get(Number(id)) as unknown as PedidoConRepartidor;
  return withCors(NextResponse.json(row));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);

  const current = db
    .prepare("SELECT id, empresa_id FROM pedidos WHERE id = ?")
    .get(Number(id)) as { id: number; empresa_id: number | null } | undefined;
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
  return withCors(NextResponse.json({ ok: true }));
}
