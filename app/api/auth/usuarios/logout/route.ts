import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getUsuarioByToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const token = bearerToken(req);
  const usuario = getUsuarioByToken(db, token);

  if (!usuario) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  db.prepare("UPDATE usuarios SET token = NULL WHERE id = ?").run(usuario.id);
  return withCors(NextResponse.json({ ok: true }));
}
