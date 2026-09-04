import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function bearerToken(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

export function getRepartidorByToken(db: DatabaseSync, token: string) {
  if (!token) return undefined;
  return db
    .prepare("SELECT id, nombre, telefono, estado FROM repartidores WHERE token = ?")
    .get(token) as { id: number; nombre: string; telefono: string; estado: string } | undefined;
}

export interface UsuarioSesion {
  id: number;
  rol_id: number;
  nombre: string;
  email: string;
}

export function getUsuarioByToken(db: DatabaseSync, token: string): UsuarioSesion | undefined {
  if (!token) return undefined;
  return db
    .prepare("SELECT id, rol_id, nombre, email FROM usuarios WHERE token = ?")
    .get(token) as UsuarioSesion | undefined;
}

export interface RequestActor {
  tipo: "admin" | "empresa" | "repartidor" | "anonimo";
  usuario?: UsuarioSesion;
  repartidor?: { id: number; nombre: string; telefono: string; estado: string };
}

export function getActor(db: DatabaseSync, req: Request): RequestActor {
  const token = bearerToken(req);
  if (!token) return { tipo: "anonimo" };
  const usuario = getUsuarioByToken(db, token);
  if (usuario) {
    return {
      tipo: usuario.rol_id === 1 ? "admin" : "empresa",
      usuario,
    };
  }
  const repartidor = getRepartidorByToken(db, token);
  if (repartidor) {
    return { tipo: "repartidor", repartidor };
  }
  return { tipo: "anonimo" };
}
