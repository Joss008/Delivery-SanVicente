import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";
import { PedidoConRepartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

export async function OPTIONS() {
  return corsPreflight("POST, OPTIONS");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const repartidor = getRepartidorByToken(db, bearerToken(req));
  if (!repartidor) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return withCors(NextResponse.json({ error: "ID inválido" }, { status: 400 }));
  }

  const result = db
    .prepare(
      "UPDATE pedidos SET estado = 'asignado', repartidor_id = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'pendiente' AND repartidor_id IS NULL"
    )
    .run(repartidor.id, id);

  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No se pudo aceptar el pedido" }, { status: 409 }));
  }

  db.prepare("UPDATE repartidores SET estado = 'ocupado' WHERE id = ?").run(repartidor.id);

  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as unknown as PedidoConRepartidor;

  return withCors(NextResponse.json(row));
}
