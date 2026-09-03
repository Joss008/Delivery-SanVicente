import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM repartidores WHERE id = ?").get(Number(id)) as unknown as Repartidor | undefined;
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const estado = String(body.estado ?? "disponible");
  const lat = Number(body.lat ?? -13.0833);
  const lng = Number(body.lng ?? -76.3833);

  if (!nombre || !telefono) {
    return NextResponse.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare(
      "UPDATE repartidores SET nombre = ?, telefono = ?, estado = ?, lat = ?, lng = ?, actualizado_en = datetime('now') WHERE id = ?"
    )
    .run(nombre, telefono, estado, lat, lng, Number(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const row = db.prepare("SELECT * FROM repartidores WHERE id = ?").get(Number(id)) as unknown as Repartidor;
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const result = db.prepare("DELETE FROM repartidores WHERE id = ?").run(Number(id));
  if (result.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
