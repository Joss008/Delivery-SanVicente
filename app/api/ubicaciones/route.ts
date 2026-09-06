import { NextRequest, NextResponse } from "next/server";
import { getDb, REPARTIDOR_PUBLIC_COLUMNS } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("POST, DELETE, OPTIONS");
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

  // Cada envío real limpia el flag de "GPS en pausa" para que el mapa vuelva
  // a mostrar al repartidor en vivo. La coordenada anterior (si existía) se
  // reemplaza, no se acumula.
  db.prepare(
    "UPDATE repartidores SET lat = ?, lng = ?, actualizado_en = datetime('now'), ubicacion_recibida_en = datetime('now'), gps_pausado_en = NULL WHERE id = ?"
  ).run(lat, lng, repartidor.id);

  const row = db
    .prepare(`SELECT ${REPARTIDOR_PUBLIC_COLUMNS} FROM repartidores WHERE id = ?`)
    .get(repartidor.id) as unknown as Repartidor;

  return withCors(NextResponse.json(row));
}

// La PWA llama a este endpoint cuando el repartidor desactiva el envío de
// ubicación desde la app. NO borramos lat/lng ni ubicacion_recibida_en: la
// idea es que el mapa del panel siga mostrando al repartidor en su ÚLTIMA
// coordenada conocida (con un estilo atenuado "GPS en pausa") hasta que
// vuelva a enviar coordenadas reales o cierre sesión.
export async function DELETE(req: NextRequest) {
  const db = getDb();
  const token = bearerToken(req);
  const repartidor = getRepartidorByToken(db, token);

  if (!repartidor) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  db.prepare(
    "UPDATE repartidores SET gps_pausado_en = datetime('now') WHERE id = ?"
  ).run(repartidor.id);

  return withCors(NextResponse.json({ ok: true }));
}
