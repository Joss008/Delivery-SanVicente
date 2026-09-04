import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const repartidor_id = Number(body.repartidor_id);
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isFinite(repartidor_id) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return withCors(
      NextResponse.json(
        { error: "repartidor_id, lat y lng son obligatorios" },
        { status: 400 }
      )
    );
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE repartidores SET lat = ?, lng = ?, actualizado_en = datetime('now') WHERE id = ?")
    .run(lat, lng, repartidor_id);

  if (result.changes === 0) {
    return withCors(
      NextResponse.json({ error: "Repartidor no encontrado" }, { status: 404 })
    );
  }

  const row = db
    .prepare("SELECT * FROM repartidores WHERE id = ?")
    .get(repartidor_id) as unknown as Repartidor;

  return withCors(NextResponse.json(row));
}
