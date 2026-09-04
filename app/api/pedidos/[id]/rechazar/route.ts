import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";
import { enviarAlertaTelegram } from "@/lib/telegram";
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

  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as unknown as PedidoConRepartidor | undefined;
  if (!row || row.estado !== "pendiente") {
    return withCors(NextResponse.json({ error: "No se pudo rechazar el pedido" }, { status: 409 }));
  }

  await enviarAlertaTelegram(`⚠️ Pedido <b>${row.codigo}</b> rechazado por ${repartidor.nombre}.`);

  return withCors(NextResponse.json(row));
}
