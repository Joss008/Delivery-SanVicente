import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { bearerToken, getUsuarioByToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("GET, OPTIONS");
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const usuario = getUsuarioByToken(db, bearerToken(req));

  if (!usuario) {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  return withCors(NextResponse.json({ usuario }));
}
