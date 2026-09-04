import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM repartidores ORDER BY id DESC").all() as unknown as Repartidor[];
  return withCors(NextResponse.json(rows));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const estado = String(body.estado ?? "disponible");
  const lat = Number(body.lat ?? -13.0833);
  const lng = Number(body.lng ?? -76.3833);

  if (!nombre || !telefono) {
    return withCors(
      NextResponse.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 })
    );
  }

  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO repartidores (nombre, telefono, estado, lat, lng) VALUES (?, ?, ?, ?, ?)"
    )
    .run(nombre, telefono, estado, lat, lng);

  const row = db
    .prepare("SELECT * FROM repartidores WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as unknown as Repartidor;
  return withCors(NextResponse.json(row, { status: 201 }));
}
