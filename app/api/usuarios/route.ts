import { NextRequest, NextResponse } from "next/server";
import { getDb, ROL_EMPRESA } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor, hashPassword } from "@/lib/auth";
import { Usuario } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT id, rol_id, nombre, email, creado_en
  FROM usuarios
  WHERE rol_id = ?
  ORDER BY nombre ASC
`;

function requireAdmin(actor: ReturnType<typeof getActor>) {
  if (actor.tipo !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function OPTIONS() {
  return corsPreflight("GET, POST, OPTIONS");
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);
  const denied = requireAdmin(actor);
  if (denied) return withCors(denied);

  const rows = db.prepare(SELECT).all(ROL_EMPRESA) as unknown as Usuario[];
  return withCors(NextResponse.json(rows));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);
  const denied = requireAdmin(actor);
  if (denied) return withCors(denied);

  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();

  if (!nombre || !email || !password) {
    return withCors(
      NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios" },
        { status: 400 }
      )
    );
  }

  const existing = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email) as
    | { id: number }
    | undefined;
  if (existing) {
    return withCors(
      NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
    );
  }

  const { hash, salt } = hashPassword(password);
  const result = db
    .prepare(
      "INSERT INTO usuarios (rol_id, nombre, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
    )
    .run(ROL_EMPRESA, nombre, email, hash, salt);

  const row = db
    .prepare("SELECT id, rol_id, nombre, email, creado_en FROM usuarios WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as unknown as Usuario;
  return withCors(NextResponse.json(row, { status: 201 }));
}
