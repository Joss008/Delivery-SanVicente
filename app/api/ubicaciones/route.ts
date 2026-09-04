import { NextRequest, NextResponse } from "next/server";
import { getDb, REPARTIDOR_PUBLIC_COLUMNS } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const token = bearerToken(req);
  const repartidor = getRepartidorByToken(db, token);

  if (!repartidor) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const body = await req.json();
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return withCors(NextResponse.json({ error: "lat y lng son obligatorios" }, { status: 400 }));
  }

  db.prepare("UPDATE repartidores SET lat = ?, lng = ?, actualizado_en = datetime('now') WHERE id = ?")
    .run(lat, lng, repartidor.id);

  const row = db
    .prepare(`SELECT ${REPARTIDOR_PUBLIC_COLUMNS} FROM repartidores WHERE id = ?`)
    .get(repartidor.id) as unknown as Repartidor;

  return withCors(NextResponse.json(row));
}
