import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor } from "@/lib/auth";
import { PedidoConRepartidor } from "@/lib/types";
import { acumularReclamo, isoAhora, registrarEvento } from "@/lib/antifraude";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT p.*, r.nombre AS repartidor_nombre
  FROM pedidos p
  LEFT JOIN repartidores r ON r.id = p.repartidor_id
`;

export async function OPTIONS() {
  return corsPreflight("POST, OPTIONS");
}

/**
 * Endpoint para que la EMPRESA abra una disputa cuando dice "no recibí el
 * pedido". Sólo se puede reclamar un pedido que ya esté en estado
 * "entregado". El pedido pasa a estado "disputado" y se registra como
 * antecedente del repartidor.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const actor = getActor(db, req);
  if (actor.tipo !== "empresa" || !actor.usuario) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return withCors(NextResponse.json({ error: "ID inválido" }, { status: 400 }));
  }

  const body = await req.json().catch(() => ({}));
  const motivo = String(body.motivo ?? "").trim().slice(0, 500);

  const pedido = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as
    | (PedidoConRepartidor & { repartidor_id: number | null })
    | undefined;
  if (!pedido) {
    return withCors(NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 }));
  }
  if (pedido.empresa_id !== actor.usuario.id) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }
  if (pedido.estado !== "entregado") {
    return withCors(
      NextResponse.json(
        { error: "Sólo puedes reclamar un pedido que figure como entregado." },
        { status: 409 }
      )
    );
  }

  db.prepare(
    `UPDATE pedidos
            SET reclamado_en = ?,
                reclamado_por = ?,
                reclamo_motivo = ?,
                estado = 'disputado',
                actualizado_en = datetime('now')
          WHERE id = ?`
  ).run(isoAhora(), actor.usuario.id, motivo || "No recibí el pedido", id);

  if (pedido.repartidor_id != null) {
    acumularReclamo(db, pedido.repartidor_id);
  }

  registrarEvento(db, {
    pedidoId: id,
    tipo: "reclamo",
    actorTipo: "empresa",
    actorId: actor.usuario.id,
    detalle: motivo || "No recibí el pedido",
  });

  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as unknown as PedidoConRepartidor;
  return withCors(NextResponse.json(row));
}