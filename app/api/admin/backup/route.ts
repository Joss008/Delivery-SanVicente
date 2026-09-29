import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getDb, DB_PATH } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("GET, OPTIONS");
}

/**
 * Descarga una copia consistente de la BD SQLite para backup. Sólo admin.
 *
 * Antes de leer el archivo forzamos un `wal_checkpoint(TRUNCATE)` para que
 * las escrituras pendientes del WAL queden consolidadas en el archivo
 * principal. Sin esto, una copia del `.db` durante una escritura podría
 * ser inconsistente al restaurar.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);
  if (actor.tipo !== "admin") {
    return withCors(
      NextResponse.json({ error: "No autorizado" }, { status: 401 })
    );
  }

  try {
    db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").run();
  } catch (err) {
    console.warn("[backup] No se pudo hacer wal_checkpoint:", err);
  }

  if (!fs.existsSync(DB_PATH)) {
    return withCors(
      NextResponse.json({ error: "Archivo de BD no encontrado" }, { status: 500 })
    );
  }

  const buffer = fs.readFileSync(DB_PATH);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `reparto-${stamp}.db`;

  const res = new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
  return withCors(res, "GET, OPTIONS");
}