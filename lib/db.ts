import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { hashPassword } from "@/lib/auth";

// DATA_DIR puede apuntar a un disco persistente en producción (Render).
// Por defecto se usa ./data dentro del proyecto (útil para dev local).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "reparto.db");

export const REPARTIDOR_PUBLIC_COLUMNS =
  "id, nombre, telefono, estado, lat, lng, actualizado_en, ubicacion_recibida_en, gps_pausado_en, empresa_id, telegram_chat_id";

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
      direccion TEXT,
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
  if (!repColNames.includes("gps_pausado_en")) {
    // Timestamp de cuándo el repartidor desactivó manualmente el envío de
    // ubicación desde la PWA. Mientras esté definido, el mapa muestra al
    // repartidor en su última coordenada conocida con un marcador apagado.
    database.exec("ALTER TABLE repartidores ADD COLUMN gps_pausado_en TEXT");
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

  const usuarioCols = database
    .prepare("SELECT name FROM pragma_table_info('usuarios')")
    .all() as { name: string }[];
  const usuarioColNames = usuarioCols.map((c) => c.name);
  if (!usuarioColNames.includes("direccion")) {
    database.exec("ALTER TABLE usuarios ADD COLUMN direccion TEXT");
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
  // Solo sembramos la cuenta administradora por defecto. Las empresas y los
  // repartidores se crean desde el panel para mantener la base de producción
  // limpia de datos de demo.
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
}

// Limpia los registros demo que pudieron quedar en bases existentes antes de
// pasar a producción. Es idempotente: si los datos ya no están, no hace nada.
// La identificación es por campos únicos del seed (email / teléfono / código),
// así que no toca empresas, repartidores ni pedidos reales creados por el admin.
function purgeDemoData(database: DatabaseSync) {
  const demoEmpresaEmails = [
    "casa@reparto.local",
    "fogon@reparto.local",
    "menu@reparto.local",
    "dragon@reparto.local",
  ];
  const demoRepartidorTelefonos = [
    "999111222",
    "999333444",
    "999555666",
    "999777888",
  ];
  const demoPedidoCodigos = ["PED-1001", "PED-1002", "PED-1003", "PED-1004"];

  const placeholders = (n: number) => new Array(n).fill("?").join(",");

  // 1) Pedidos demo (los borramos primero por claridad; los pedidos.empresa_id
  //    tienen ON DELETE CASCADE, pero queremos que el borrado sea explícito).
  const pedResult = database
    .prepare(`DELETE FROM pedidos WHERE codigo IN (${placeholders(demoPedidoCodigos.length)})`)
    .run(...demoPedidoCodigos);

  // 2) Empresas demo (rol_id = 2 para no tocar al admin).
  const empResult = database
    .prepare(
      `DELETE FROM usuarios WHERE rol_id = ? AND email IN (${placeholders(demoEmpresaEmails.length)})`
    )
    .run(ROL_EMPRESA, ...demoEmpresaEmails);

  // 3) Repartidores demo.
  const repResult = database
    .prepare(
      `DELETE FROM repartidores WHERE telefono IN (${placeholders(demoRepartidorTelefonos.length)})`
    )
    .run(...demoRepartidorTelefonos);

  if (pedResult.changes || empResult.changes || repResult.changes) {
    console.log(
      `[db] Purga demo: ${empResult.changes} empresa(s), ${repResult.changes} repartidor(es), ${pedResult.changes} pedido(s) eliminados.`
    );
  }
}

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  ensureSchema(db);
  seed(db);
  purgeDemoData(db);
  ensureDefaultPasswords(db);

  // Backfill en segundo plano: re-geocodifica pedidos cuyas coordenadas siguen
  // siendo el placeholder (-13.0833, -76.3833). No bloquea el arranque del
  // servidor y respeta el rate-limit de Nominatim (~1 req/s).
  void backfillPedidoCoords(db);

  return db;
}

const PLACEHOLDER_LAT = -13.0833;
const PLACEHOLDER_LNG = -76.3833;
const BACKFILL_RADIUS_KM = 200;

declare global {

  var __geocodeBackfillRunning: boolean | undefined;
}

async function backfillPedidoCoords(database: DatabaseSync): Promise<void> {
  if (globalThis.__geocodeBackfillRunning) return;
  globalThis.__geocodeBackfillRunning = true;

  try {
    // Importación perezosa para no introducir ciclos con lib/geocode.
    const { geocodeAddress } = await import("@/lib/geocode");

    // Re-geocodificamos:
    //   1) los pedidos con coordenadas placeholder exactas
    //   2) los pedidos con coordenadas fuera de la zona de Cañete (errores
    //      previos que el filtro regional del mapa estaría ocultando).
    const allRows = database
      .prepare(
        "SELECT id, direccion_entrega, lat, lng FROM pedidos WHERE direccion_entrega IS NOT NULL AND direccion_entrega != ''"
      )
      .all() as Array<{
      id: number;
      direccion_entrega: string;
      lat: number;
      lng: number;
    }>;

    const CAÑETE_LAT = PLACEHOLDER_LAT;
    const CAÑETE_LNG = PLACEHOLDER_LNG;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const haversineKm = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const candidatos = allRows.filter((row) => {
      const esPlaceholder =
        row.lat === PLACEHOLDER_LAT && row.lng === PLACEHOLDER_LNG;
      const distancia = haversineKm(CAÑETE_LAT, CAÑETE_LNG, row.lat, row.lng);
      return esPlaceholder || distancia > BACKFILL_RADIUS_KM;
    });

    if (candidatos.length === 0) return;

    console.log(
      `[geocode-backfill] Re-geocodificando ${candidatos.length} pedido(s) con coordenadas dudosas…`
    );
    const update = database.prepare(
      "UPDATE pedidos SET lat = ?, lng = ? WHERE id = ?"
    );
    for (const row of candidatos) {
      try {
        const geo = await geocodeAddress(row.direccion_entrega);
        if (geo) {
          update.run(geo.lat, geo.lng, row.id);
          console.log(
            `[geocode-backfill] Pedido ${row.id} → ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`
          );
        }
      } catch (err) {
        console.warn(`[geocode-backfill] Pedido ${row.id}:`, err);
      }
      // ~1.1s entre peticiones para respetar el límite de Nominatim.
      await new Promise((r) => setTimeout(r, 1100));
    }
    console.log("[geocode-backfill] Listo.");
  } catch (err) {
    console.warn("[geocode-backfill] Error general:", err);
  } finally {
    globalThis.__geocodeBackfillRunning = false;
  }
}
