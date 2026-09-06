import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("GET, OPTIONS");
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const token = bearerToken(req);

  if (!token) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  // Devolvemos también la última ubicación conocida para que la PWA pueda
  // mostrarla mientras espera la siguiente captura GPS.
  const row = db
    .prepare(
      `SELECT id, nombre, telefono, estado, lat, lng, ubicacion_recibida_en
       FROM repartidores WHERE token = ?`
    )
    .get(token) as
    | {
      id: number;
      nombre: string;
      telefono: string;
      estado: string;
      lat: number;
      lng: number;
      ubicacion_recibida_en: string | null;
    }
    | undefined;

  if (!row) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  return withCors(NextResponse.json({ repartidor: row }));
}
