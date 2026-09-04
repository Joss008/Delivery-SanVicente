import { NextResponse } from "next/server";

export function withCors(response: NextResponse, methods = "GET, POST, OPTIONS"): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", methods);
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export function corsPreflight(methods = "GET, POST, OPTIONS"): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }), methods);
}
