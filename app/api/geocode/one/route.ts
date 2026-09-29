import { NextRequest, NextResponse } from "next/server";
import { withCors, corsPreflight } from "@/lib/cors";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("GET, OPTIONS");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return withCors(
      NextResponse.json({ error: "Dirección demasiado corta" }, { status: 400 })
    );
  }
  const coords = await geocodeAddress(q);
  if (!coords) {
    return withCors(
      NextResponse.json(
        { error: "No se pudo geocodificar la dirección" },
        { status: 404 }
      )
    );
  }
  return withCors(NextResponse.json(coords));
}