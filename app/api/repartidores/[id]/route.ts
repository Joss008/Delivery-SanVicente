import { NextRequest, NextResponse } from "next/server";
import type { SQLInputValue } from "node:sqlite";
import { getDb, REPARTIDOR_PUBLIC_COLUMNS } from "@/lib/db";
import { withCors } from "@/lib/cors";
import { getActor, hashPassword } from "@/lib/auth";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

function requireAdmin(actor: ReturnType<typeof getActor>) {
  if (actor.tipo !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
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
  const denied = requireAdmin(actor);
  if (denied) return withCors(denied);

  const current = db
    .prepare("SELECT id FROM repartidores WHERE id = ?")
    .get(Number(id)) as { id: number } | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const estadoEnBody = body.estado !== undefined;
  const estado = String(body.estado ?? "disponible");
  const telegram_chat_id =
    body.telegram_chat_id === null || body.telegram_chat_id === undefined
      ? undefined
      : String(body.telegram_chat_id).trim() || null;
  const password = String(body.password ?? "").trim();

  if (!nombre || !telefono) {
    return withCors(
      NextResponse.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 })
    );
  }

  // Construimos el UPDATE dinámicamente para no pisar columnas que el cliente
  // no está enviando en esta versión del formulario (p.ej. `estado`).
  // - `estado`: solo se actualiza si viene en el body; si no, conserva el valor actual.
  // - `telegram_chat_id`: si viene (incluso null) se actualiza; si no, conserva.
  // - lat/lng NO se actualizan aquí: la única fuente válida es la PWA.
  const sets: string[] = ["nombre = ?", "telefono = ?"];
  const values: SQLInputValue[] = [nombre, telefono];
  if (estadoEnBody) {
    sets.push("estado = ?");
    values.push(estado);
  }
  if (telegram_chat_id !== undefined) {
    sets.push("telegram_chat_id = ?");
    values.push(telegram_chat_id);
  }
  if (password) {
    const { hash, salt } = hashPassword(password);
    sets.push("password_hash = ?", "password_salt = ?");
    values.push(hash, salt);
  }
  sets.push("actualizado_en = datetime('now')");
  values.push(Number(id));

  const result = db
    .prepare(`UPDATE repartidores SET ${sets.join(", ")} WHERE id = ?`)
    .run(...values);

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
  const denied = requireAdmin(actor);
  if (denied) return withCors(denied);

  const current = db
    .prepare("SELECT id FROM repartidores WHERE id = ?")
    .get(Number(id)) as { id: number } | undefined;
  if (!current) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const result = db.prepare("DELETE FROM repartidores WHERE id = ?").run(Number(id));
  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  return withCors(NextResponse.json({ ok: true }));
}
