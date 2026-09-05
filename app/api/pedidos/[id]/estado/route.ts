import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";
import { EstadoPedido, PedidoConRepartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: [],
  asignado: ["en_camino"],
  en_camino: ["entregado"],
  entregado: [],
};

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

  const body = await req.json();
  const nuevoEstado = String(body.estado ?? "") as EstadoPedido;
  if (!(nuevoEstado in TRANSICIONES)) {
    return withCors(NextResponse.json({ error: "Estado inválido" }, { status: 400 }));
  }

  const pedido = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as unknown as PedidoConRepartidor | undefined;
  if (!pedido || pedido.repartidor_id !== repartidor.id || !TRANSICIONES[pedido.estado].includes(nuevoEstado)) {
    return withCors(NextResponse.json({ error: "No se pudo actualizar el estado" }, { status: 409 }));
  }

  db.prepare("UPDATE pedidos SET estado = ?, actualizado_en = datetime('now') WHERE id = ?").run(nuevoEstado, id);

  if (nuevoEstado === "entregado") {
    db.prepare("UPDATE repartidores SET estado = 'disponible' WHERE id = ?").run(repartidor.id);
  }

  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as unknown as PedidoConRepartidor;

  return withCors(NextResponse.json(row));
}
