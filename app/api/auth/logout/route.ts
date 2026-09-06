import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getRepartidorByToken } from "@/lib/auth";

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

  // Al cerrar sesión solo invalidamos el token de sesión. Mantenemos la
  // última ubicación conocida para que el panel del admin siga mostrando al
  // repartidor en su última coordenada real. Marcamos también el GPS como
  // "en pausa" para que el marcador se atenúe hasta el próximo inicio de
  // sesión + envío desde la PWA.
  db.prepare(
    "UPDATE repartidores SET token = NULL, gps_pausado_en = datetime('now') WHERE id = ?"
  ).run(repartidor.id);
  return withCors(NextResponse.json({ ok: true }));
}
