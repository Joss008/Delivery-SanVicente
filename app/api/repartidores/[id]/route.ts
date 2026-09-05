import { NextRequest, NextResponse } from "next/server";
import { getDb, REPARTIDOR_PUBLIC_COLUMNS } from "@/lib/db";
import { withCors } from "@/lib/cors";
import { getActor, hashPassword } from "@/lib/auth";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

function canManage(actor: ReturnType<typeof getActor>, row: { empresa_id: number | null }) {
  if (actor.tipo === "admin") return true;
  if (actor.tipo === "empresa" && actor.usuario) {
    return row.empresa_id === actor.usuario.id;
  }
  return false;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }), "GET, PUT, DELETE, OPTIONS");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare(`SELECT ${REPARTIDOR_PUBLIC_COLUMNS} FROM repartidores WHERE id = ?`)
    .get(Number(id)) as unknown as Repartidor | undefined;
  if (!row) return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  return withCors(NextResponse.json(row));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);

  const current = db
    .prepare("SELECT id, empresa_id FROM repartidores WHERE id = ?")
    .get(Number(id)) as { id: number; empresa_id: number | null } | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, current)) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const estado = String(body.estado ?? "disponible");
  const password = String(body.password ?? "").trim();

  if (!nombre || !telefono) {
    return withCors(
      NextResponse.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 })
    );
  }

  // Nota: lat/lng NO se actualizan aquí. La única fuente válida de coordenadas
  // es la PWA (POST /api/ubicaciones). Si llegan en el body, se ignoran.
  let result;
  if (password) {
    const { hash, salt } = hashPassword(password);
    result = db
      .prepare(
        "UPDATE repartidores SET nombre = ?, telefono = ?, estado = ?, password_hash = ?, password_salt = ?, actualizado_en = datetime('now') WHERE id = ?"
      )
      .run(nombre, telefono, estado, hash, salt, Number(id));
  } else {
    result = db
      .prepare(
        "UPDATE repartidores SET nombre = ?, telefono = ?, estado = ?, actualizado_en = datetime('now') WHERE id = ?"
      )
      .run(nombre, telefono, estado, Number(id));
  }

  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const row = db
    .prepare(`SELECT ${REPARTIDOR_PUBLIC_COLUMNS} FROM repartidores WHERE id = ?`)
    .get(Number(id)) as unknown as Repartidor;
  return withCors(NextResponse.json(row));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);

  const current = db
    .prepare("SELECT id, empresa_id FROM repartidores WHERE id = ?")
    .get(Number(id)) as { id: number; empresa_id: number | null } | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  if (!canManage(actor, current)) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const result = db.prepare("DELETE FROM repartidores WHERE id = ?").run(Number(id));
  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  return withCors(NextResponse.json({ ok: true }));
}
