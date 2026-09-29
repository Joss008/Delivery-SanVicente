import { NextRequest, NextResponse } from "next/server";
import { withCors, corsPreflight } from "@/lib/cors";
import { searchAddressSuggestions } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight("GET, OPTIONS");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw) || 5, 1), 10);

  if (q.length < 3) {
    return withCors(NextResponse.json({ sugerencias: [] }));
  }

  const sugerencias = await searchAddressSuggestions(q, limit);
  return withCors(NextResponse.json({ sugerencias }));
}