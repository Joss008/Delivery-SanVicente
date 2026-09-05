import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { hashPassword } from "@/lib/auth";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "reparto.db");

export const REPARTIDOR_PUBLIC_COLUMNS =
  "id, nombre, telefono, estado, lat, lng, actualizado_en, ubicacion_recibida_en, empresa_id, telegram_chat_id";

// Coordenadas que se consideran "no provienen de la PWA" (defaults del schema/seed).
// Se usan en la migración para distinguir ubicaciones reales de placeholders.
const REPARTIDOR_DEFAULT_LAT = -13.0833;
const REPARTIDOR_DEFAULT_LNG = -76.3833;
const REPARTIDOR_SEED_COORDS: ReadonlyArray<readonly [number, number]> = [
  [-13.0781, -76.3788],
  [-13.0862, -76.3861],
  [-13.0914, -76.3722],
  [-13.0723, -76.3956],
];

export const ROL_ADMIN = 1;
export const ROL_EMPRESA = 2;

let db: DatabaseSync | null = null;

function ensureSchema(database: DatabaseSync) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rol_id INTEGER NOT NULL CHECK (rol_id IN (1, 2)),
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      password_salt TEXT,
      token TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS repartidores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'disponible',
      lat REAL NOT NULL DEFAULT -13.0833,
      lng REAL NOT NULL DEFAULT -76.3833,
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      empresa_id INTEGER,
      empresa TEXT NOT NULL,
      direccion_recojo TEXT NOT NULL,
      direccion_entrega TEXT NOT NULL,
      observaciones TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      repartidor_id INTEGER,
      lat REAL NOT NULL DEFAULT -13.0833,
      lng REAL NOT NULL DEFAULT -76.3833,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (repartidor_id) REFERENCES repartidores(id) ON DELETE SET NULL
    );
  `);

  const pedCols = database
    .prepare("SELECT name FROM pragma_table_info('pedidos')")
    .all() as { name: string }[];
  const pedColNames = pedCols.map((c) => c.name);
  const hasOldSchema = pedColNames.includes("cliente") || pedColNames.includes("descripcion");
  if (hasOldSchema) {
    database.exec("DROP TABLE pedidos;");
    database.exec(`
      CREATE TABLE pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL,
        empresa_id INTEGER,
        empresa TEXT NOT NULL,
        direccion_recojo TEXT NOT NULL,
        direccion_entrega TEXT NOT NULL,
        observaciones TEXT,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        repartidor_id INTEGER,
        lat REAL NOT NULL DEFAULT -13.0833,
        lng REAL NOT NULL DEFAULT -76.3833,
        creado_en TEXT NOT NULL DEFAULT (datetime('now')),
        actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (empresa_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (repartidor_id) REFERENCES repartidores(id) ON DELETE SET NULL
      );
    `);
  }

  const repCols = database
    .prepare("SELECT name FROM pragma_table_info('repartidores')")
    .all() as { name: string }[];
  const repColNames = repCols.map((c) => c.name);
  if (!repColNames.includes("password_hash")) {
    database.exec("ALTER TABLE repartidores ADD COLUMN password_hash TEXT");
  }
  if (!repColNames.includes("password_salt")) {
    database.exec("ALTER TABLE repartidores ADD COLUMN password_salt TEXT");
  }
  if (!repColNames.includes("token")) {
    database.exec("ALTER TABLE repartidores ADD COLUMN token TEXT");
  }
  if (!repColNames.includes("empresa_id")) {
    database.exec("ALTER TABLE repartidores ADD COLUMN empresa_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL");
  }
  if (!repColNames.includes("ubicacion_recibida_en")) {
    database.exec("ALTER TABLE repartidores ADD COLUMN ubicacion_recibida_en TEXT");
  }
  if (!repColNames.includes("telegram_chat_id")) {
    database.exec("ALTER TABLE repartidores ADD COLUMN telegram_chat_id TEXT");
  }

  // Backfill: marcar como "ubicación recibida por la PWA" a los repartidores cuyas
  // coordenadas no coinciden con los defaults ni con los valores del seed histórico.
  // Los repartidores seed/default quedan sin marcar y no aparecen en el mapa
  // hasta que la PWA envíe una ubicación real.
  database
    .prepare(
      "UPDATE repartidores SET ubicacion_recibida_en = actualizado_en WHERE ubicacion_recibida_en IS NULL AND actualizado_en IS NOT NULL AND lat IS NOT NULL AND lng IS NOT NULL AND NOT (lat = ? AND lng = ?)"
    )
    .run(REPARTIDOR_DEFAULT_LAT, REPARTIDOR_DEFAULT_LNG);
  for (const [sLat, sLng] of REPARTIDOR_SEED_COORDS) {
    database
      .prepare(
        "UPDATE repartidores SET ubicacion_recibida_en = NULL WHERE lat = ? AND lng = ?"
      )
      .run(sLat, sLng);
  }

  const pedidoCols = database
    .prepare("SELECT name FROM pragma_table_info('pedidos')")
    .all() as { name: string }[];
  const pedidoColNames = pedidoCols.map((c) => c.name);
  if (!pedidoColNames.includes("empresa_id")) {
    database.exec("ALTER TABLE pedidos ADD COLUMN empresa_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE");
  }
}

function ensureDefaultPasswords(database: DatabaseSync) {
  const rows = database
    .prepare("SELECT id, telefono FROM repartidores WHERE password_hash IS NULL")
    .all() as { id: number; telefono: string }[];
  for (const r of rows) {
    const { hash, salt } = hashPassword(r.telefono);
    database
      .prepare("UPDATE repartidores SET password_hash = ?, password_salt = ? WHERE id = ?")
      .run(hash, salt, r.id);
  }
}

function seed(database: DatabaseSync) {
  // Admin por defecto
  const adminCount = database
    .prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol_id = ?")
    .get(ROL_ADMIN) as { n: number };
  if (adminCount.n === 0) {
    const { hash, salt } = hashPassword("admin123");
    database
      .prepare(
        "INSERT INTO usuarios (rol_id, nombre, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
      )
      .run(ROL_ADMIN, "Administrador", "admin@reparto.local", hash, salt);
  }

  // Empresas demo: una por cada empresa del seed histórico de pedidos.
  const seedEmpresas: { nombre: string; email: string; password: string }[] = [
    { nombre: "La Casa del Pollo", email: "casa@reparto.local", password: "demo1234" },
    { nombre: "Parrillas El Fogón", email: "fogon@reparto.local", password: "demo1234" },
    { nombre: "Menú Express Cañete", email: "menu@reparto.local", password: "demo1234" },
    { nombre: "Chifa Dragón Dorado", email: "dragon@reparto.local", password: "demo1234" },
  ];
  const existingEmpresaNames = new Set(
    (database.prepare("SELECT nombre FROM usuarios WHERE rol_id = ?").all(ROL_EMPRESA) as {
      nombre: string;
    }[]).map((u) => u.nombre)
  );
  const insertEmpresa = database.prepare(
    "INSERT INTO usuarios (rol_id, nombre, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
  );
  for (const e of seedEmpresas) {
    if (!existingEmpresaNames.has(e.nombre)) {
      const { hash, salt } = hashPassword(e.password);
      insertEmpresa.run(ROL_EMPRESA, e.nombre, e.email, hash, salt);
    }
  }

  // Repartidores demo
  const repCount = database.prepare("SELECT COUNT(*) AS n FROM repartidores").get() as { n: number };
  if (repCount.n === 0) {
    const insertRep = database.prepare(
      "INSERT INTO repartidores (empresa_id, nombre, telefono, estado) VALUES (?, ?, ?, ?)"
    );
    const empresas = database
      .prepare("SELECT id, nombre FROM usuarios WHERE rol_id = ?")
      .all(ROL_EMPRESA) as { id: number; nombre: string }[];
    const empresaByNombre = new Map(empresas.map((e) => [e.nombre, e.id]));
    const fallbackEmpresaId = empresas[0]?.id ?? null;

    // Coordenadas vacías: la única fuente válida de lat/lng es la PWA
    // (endpoint /api/ubicaciones). Hasta que el repartidor abra la PWA
    // y se reporte su GPS real, no aparecerá en el mapa.
    const repartidores: [string | null, string, string, string][] = [
      ["La Casa del Pollo", "Carlos Mendoza", "999111222", "disponible"],
      ["Parrillas El Fogón", "Luis Quispe", "999333444", "ocupado"],
      ["Chifa Dragón Dorado", "Ana Torres", "999555666", "disponible"],
      ["Menú Express Cañete", "Pedro Rojas", "999777888", "inactivo"],
    ];
    for (const [empresaNombre, nombre, telefono, estado] of repartidores) {
      const empresaId = (empresaNombre && empresaByNombre.get(empresaNombre)) ?? fallbackEmpresaId;
      insertRep.run(empresaId, nombre, telefono, estado);
    }
  } else {
    // Backfill: asignar repartidores sin empresa a la primera empresa disponible.
    const orphanReps = database
      .prepare("SELECT id FROM repartidores WHERE empresa_id IS NULL")
      .all() as { id: number }[];
    if (orphanReps.length > 0) {
      const fallback = database
        .prepare("SELECT id FROM usuarios WHERE rol_id = ? ORDER BY id ASC LIMIT 1")
        .get(ROL_EMPRESA) as { id: number } | undefined;
      if (fallback) {
        const stmt = database.prepare("UPDATE repartidores SET empresa_id = ? WHERE empresa_id IS NULL");
        stmt.run(fallback.id);
      }
    }
  }

  const pedCount = database.prepare("SELECT COUNT(*) AS n FROM pedidos").get() as { n: number };
  if (pedCount.n > 0) {
    // Backfill: vincular pedidos existentes a la empresa cuyo nombre coincide con `empresa`.
    const pedidosSinEmpresa = database
      .prepare("SELECT id, empresa FROM pedidos WHERE empresa_id IS NULL")
      .all() as { id: number; empresa: string }[];
    const empresas = database
      .prepare("SELECT id, nombre FROM usuarios WHERE rol_id = ?")
      .all(ROL_EMPRESA) as { id: number; nombre: string }[];
    const empresaByNombre = new Map(empresas.map((e) => [e.nombre, e.id]));
    const fallback = empresas[0]?.id ?? null;
    for (const p of pedidosSinEmpresa) {
      const empId = empresaByNombre.get(p.empresa) ?? fallback;
      if (empId !== null) {
        database.prepare("UPDATE pedidos SET empresa_id = ? WHERE id = ?").run(empId, p.id);
      }
    }
    return;
  }

  const empresas = database
    .prepare("SELECT id, nombre FROM usuarios WHERE rol_id = ?")
    .all(ROL_EMPRESA) as { id: number; nombre: string }[];
  const empresaByNombre = new Map(empresas.map((e) => [e.nombre, e.id]));

  const insertPed = database.prepare(
    `INSERT INTO pedidos (codigo, empresa_id, empresa, direccion_recojo, direccion_entrega, observaciones, estado, repartidor_id, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const pedidos: [string, string, string, string, string | null, string, number | null, number, number][] = [
    ["PED-1001", "La Casa del Pollo", "Av. Mariscal Benavides 450", "Jr. Grau 210", "2 pollos a la brasa + papas", "entregado", 1, -13.0795, -76.3812],
    ["PED-1002", "Parrillas El Fogón", "Av. San Martín 780", "Calle Bolívar 145", "Parrillada familiar y gaseosa 1.5L", "asignado", 2, -13.0881, -76.3844],
    ["PED-1003", "Menú Express Cañete", "Jr. Lima 320", "Av. 28 de Julio 900", null, "pendiente", null, -13.0932, -76.3755],
    ["PED-1004", "Chifa Dragón Dorado", "Av. Arica 210", "Jr. Ayacucho 512", "Chaufa de pollo y chicha morada", "en_camino", 3, -13.0827, -76.3711],
  ];
  for (const [codigo, empresaNombre, recojo, entrega, obs, estado, repartidor_id, lat, lng] of pedidos) {
    const empresaId = empresaByNombre.get(empresaNombre) ?? null;
    insertPed.run(codigo, empresaId, empresaNombre, recojo, entrega, obs, estado, repartidor_id, lat, lng);
  }
}

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  ensureSchema(db);
  seed(db);
  ensureDefaultPasswords(db);
  return db;
}
