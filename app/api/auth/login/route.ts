import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { generateToken, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const telefono = String(body.telefono ?? "").trim();
  const password = String(body.password ?? "");

  if (!telefono || !password) {
    return withCors(
      NextResponse.json({ error: "Teléfono y contraseña son obligatorios" }, { status: 400 })
    );
  }

  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, nombre, telefono, estado, password_hash, password_salt FROM repartidores WHERE telefono = ?"
    )
    .get(telefono) as
    | { id: number; nombre: string; telefono: string; estado: string; password_hash: string | null; password_salt: string | null }
    | undefined;

  if (!row || !row.password_hash || !row.password_salt || !verifyPassword(password, row.password_hash, row.password_salt)) {
    return withCors(NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 }));
  }

  const token = generateToken();
  db.prepare("UPDATE repartidores SET token = ? WHERE id = ?").run(token, row.id);

  return withCors(
    NextResponse.json({
      token,
      repartidor: {
        id: row.id,
        nombre: row.nombre,
        telefono: row.telefono,
        estado: row.estado,
      },
    })
  );
}
