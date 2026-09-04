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
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return withCors(
      NextResponse.json({ error: "Email y contraseña son obligatorios" }, { status: 400 })
    );
  }

  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, rol_id, nombre, email, password_hash, password_salt FROM usuarios WHERE email = ?"
    )
    .get(email) as
    | {
        id: number;
        rol_id: number;
        nombre: string;
        email: string;
        password_hash: string | null;
        password_salt: string | null;
      }
    | undefined;

  if (
    !row ||
    !row.password_hash ||
    !row.password_salt ||
    !verifyPassword(password, row.password_hash, row.password_salt)
  ) {
    return withCors(NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 }));
  }

  const token = generateToken();
  db.prepare("UPDATE usuarios SET token = ? WHERE id = ?").run(token, row.id);

  return withCors(
    NextResponse.json({
      token,
      usuario: {
        id: row.id,
        rol_id: row.rol_id,
        nombre: row.nombre,
        email: row.email,
      },
    })
  );
}
