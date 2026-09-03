import { getDb } from "@/lib/db";
import { Repartidor, PedidoConRepartidor } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = getDb();
  const repartidores = (
    db.prepare("SELECT * FROM repartidores ORDER BY id DESC").all() as unknown as Repartidor[]
  ).map((r) => ({ ...r }));

  const pedidos = (
    db
      .prepare(
        `SELECT p.*, r.nombre AS repartidor_nombre
         FROM pedidos p
         LEFT JOIN repartidores r ON r.id = p.repartidor_id
         ORDER BY p.id DESC`
      )
      .all() as unknown as PedidoConRepartidor[]
  ).map((p) => ({ ...p }));

  return <Dashboard initialRepartidores={repartidores} initialPedidos={pedidos} />;
}
