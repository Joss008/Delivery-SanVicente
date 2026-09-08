import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/cors";
import { getActor } from "@/lib/auth";
import { repartidoresEnObservacion, resumenAntifraude } from "@/lib/antifraude";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("GET, OPTIONS");
}

/**
 * Resumen antifraude para el panel del administrador. Devuelve el agregado
 * global y la lista de repartidores en observación (reglas de reclamos o
 * tasa de sospechosas).
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const actor = getActor(db, req);
  if (actor.tipo !== "admin") {
    return withCors(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }

  return withCors(
    NextResponse.json({
      resumen: resumenAntifraude(db),
      repartidores: repartidoresEnObservacion(db),
    })
  );
}