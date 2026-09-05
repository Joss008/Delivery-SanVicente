import { NextRequest, NextResponse } from "next/server";
import type { SQLInputValue } from "node:sqlite";
import { getDb, REPARTIDOR_PUBLIC_COLUMNS } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor, hashPassword } from "@/lib/auth";
import { Repartidor } from "@/lib/types";

export const dynamic = "force-dynamic";

function authFetchOptions(actor: ReturnType<typeof getActor>) {
  if (actor.tipo === "admin") return { where: "", params: [] as SQLInputValue[] };
  if (actor.tipo === "empresa" && actor.usuario) {
    return {
      where: "WHERE empresa_id = ?",
      params: [actor.usuario.id] as SQLInputValue[],
    };
  }
  return { where: "", params: [] as SQLInputValue[] };
}

export async function OPTIONS() {
  return corsPreflight("GET, POST, OPTIONS");
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);
  const filter = authFetchOptions(actor);

  const stmt = db.prepare(
    `SELECT ${REPARTIDOR_PUBLIC_COLUMNS} FROM repartidores ${filter.where} ORDER BY id DESC`
  );
  const rows = (
    filter.params.length > 0 ? stmt.all(...filter.params) : stmt.all()
  ) as unknown as Repartidor[];
  return withCors(NextResponse.json(rows));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);

  if (actor.tipo !== "admin" && actor.tipo !== "empresa") {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const estado = String(body.estado ?? "disponible");
  // Contraseña del repartidor para la PWA: si el admin no define una, usa el teléfono.
  const password = String(body.password ?? "").trim() || telefono;

  if (!nombre || !telefono) {
    return withCors(
      NextResponse.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 })
    );
  }

  // Empresa: solo puede crear repartidores para sí misma.
  const empresaId =
    actor.tipo === "empresa" && actor.usuario ? actor.usuario.id : Number(body.empresa_id) || null;

  // Las coordenadas (lat/lng) NO se aceptan aquí. La única fuente válida es la PWA
  // mediante POST /api/ubicaciones. Si el cliente envía lat/lng, los ignoramos
  // para evitar valores fake en la base.
  const { hash, salt } = hashPassword(password);
  const result = db
    .prepare(
      "INSERT INTO repartidores (empresa_id, nombre, telefono, estado, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(empresaId, nombre, telefono, estado, hash, salt);

  const row = db
    .prepare(`SELECT ${REPARTIDOR_PUBLIC_COLUMNS} FROM repartidores WHERE id = ?`)
    .get(Number(result.lastInsertRowid)) as unknown as Repartidor;
  return withCors(NextResponse.json(row, { status: 201 }));
}
