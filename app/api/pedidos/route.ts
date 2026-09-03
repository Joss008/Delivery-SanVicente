import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Pedido, PedidoConRepartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`${SELECT} ORDER BY p.id DESC`).all() as unknown as PedidoConRepartidor[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const codigo = String(body.codigo ?? "").trim();
  const descripcion = String(body.descripcion ?? "").trim();
  const estado = String(body.estado ?? "pendiente");
  const repartidor_id = body.repartidor_id ? Number(body.repartidor_id) : null;
  const lat = Number(body.lat ?? -13.0833);
  const lng = Number(body.lng ?? -76.3833);

  if (!codigo || !descripcion) {
    return NextResponse.json({ error: "Código y descripción son obligatorios" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO pedidos (codigo, descripcion, estado, repartidor_id, lat, lng) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(codigo, descripcion, estado, repartidor_id, lat, lng);

  const row = db
    .prepare(`${SELECT} WHERE p.id = ?`)
    .get(Number(result.lastInsertRowid)) as unknown as PedidoConRepartidor;
  return NextResponse.json(row, { status: 201 });
}
