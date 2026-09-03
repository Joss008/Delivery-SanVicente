import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { PedidoConRepartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(Number(id)) as unknown as PedidoConRepartidor | undefined;
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const cliente = String(body.cliente ?? "").trim();
  const direccion = String(body.direccion ?? "").trim();
  const total = Number(body.total ?? 0);
  const estado = String(body.estado ?? "pendiente");
  const repartidor_id = body.repartidor_id ? Number(body.repartidor_id) : null;
  const lat = Number(body.lat ?? -13.0833);
  const lng = Number(body.lng ?? -76.3833);

  if (!cliente || !direccion) {
    return NextResponse.json({ error: "Cliente y dirección son obligatorios" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare(
      "UPDATE pedidos SET cliente = ?, direccion = ?, total = ?, estado = ?, repartidor_id = ?, lat = ?, lng = ? WHERE id = ?"
    )
    .run(cliente, direccion, total, estado, repartidor_id, lat, lng, Number(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(Number(id)) as unknown as PedidoConRepartidor;
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const result = db.prepare("DELETE FROM pedidos WHERE id = ?").run(Number(id));
  if (result.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
