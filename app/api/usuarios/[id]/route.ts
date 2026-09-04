import { NextRequest, NextResponse } from "next/server";
import { getDb, ROL_EMPRESA } from "@/lib/db";
import { withCors } from "@/lib/cors";
import { getActor, hashPassword } from "@/lib/auth";
import { Usuario } from "@/lib/types";

export const dynamic = "force-dynamic";

const SELECT = `
  SELECT id, rol_id, nombre, email, creado_en
  FROM usuarios
  WHERE id = ? AND rol_id = ?
`;

function requireAdmin(actor: ReturnType<typeof getActor>) {
  if (actor.tipo !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }), "PUT, DELETE, OPTIONS");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, req);
  const denied = requireAdmin(actor);
  if (denied) return withCors(denied);

  const current = db
    .prepare("SELECT id, rol_id, email FROM usuarios WHERE id = ?")
    .get(Number(id)) as { id: number; rol_id: number; email: string } | undefined;
  if (!current || current.rol_id !== ROL_EMPRESA) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();

  if (!nombre || !email) {
    return withCors(
      NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 })
    );
  }

  if (email !== current.email) {
    const dup = db.prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?").get(
      email,
      current.id
    ) as { id: number } | undefined;
    if (dup) {
      return withCors(
        NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
      );
    }
  }

  if (password) {
    const { hash, salt } = hashPassword(password);
    db.prepare(
      "UPDATE usuarios SET nombre = ?, email = ?, password_hash = ?, password_salt = ? WHERE id = ?"
    ).run(nombre, email, hash, salt, current.id);
  } else {
    db.prepare("UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?").run(
      nombre,
      email,
      current.id
    );
  }

  // Si cambió el nombre, sincronizar el campo texto `pedidos.empresa` para los pedidos de esta empresa.
  db.prepare("UPDATE pedidos SET empresa = ? WHERE empresa_id = ?").run(nombre, current.id);

  const row = db.prepare(SELECT).get(current.id, ROL_EMPRESA) as unknown as Usuario;
  return withCors(NextResponse.json(row));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const actor = getActor(db, _req);
  const denied = requireAdmin(actor);
  if (denied) return withCors(denied);

  const current = db
    .prepare("SELECT id, rol_id FROM usuarios WHERE id = ?")
    .get(Number(id)) as { id: number; rol_id: number } | undefined;
  if (!current || current.rol_id !== ROL_EMPRESA) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }

  const result = db.prepare("DELETE FROM usuarios WHERE id = ?").run(current.id);
  if (result.changes === 0) {
    return withCors(NextResponse.json({ error: "No encontrado" }, { status: 404 }));
  }
  return withCors(NextResponse.json({ ok: true }));
}
