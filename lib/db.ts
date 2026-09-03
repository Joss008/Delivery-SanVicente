import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "reparto.db");

let db: DatabaseSync | null = null;

function ensureSchema(database: DatabaseSync) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS repartidores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'disponible',
      lat REAL NOT NULL DEFAULT -13.0833,
      lng REAL NOT NULL DEFAULT -76.3833,
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      repartidor_id INTEGER,
      lat REAL NOT NULL DEFAULT -13.0833,
      lng REAL NOT NULL DEFAULT -76.3833,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (repartidor_id) REFERENCES repartidores(id) ON DELETE SET NULL
    );
  `);

  const oldSchema = database
    .prepare("SELECT COUNT(*) AS n FROM pragma_table_info('pedidos') WHERE name = 'cliente'")
    .get() as { n: number };
  if (oldSchema.n > 0) {
    database.exec("DROP TABLE pedidos;");
    database.exec(`
      CREATE TABLE pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        repartidor_id INTEGER,
        lat REAL NOT NULL DEFAULT -13.0833,
        lng REAL NOT NULL DEFAULT -76.3833,
        creado_en TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (repartidor_id) REFERENCES repartidores(id) ON DELETE SET NULL
      );
    `);
  }
}

function seed(database: DatabaseSync) {
  const repCount = database.prepare("SELECT COUNT(*) AS n FROM repartidores").get() as { n: number };
  if (repCount.n === 0) {
    const insertRep = database.prepare(
      "INSERT INTO repartidores (nombre, telefono, estado, lat, lng) VALUES (?, ?, ?, ?, ?)"
    );
    const repartidores = [
      ["Carlos Mendoza", "999111222", "disponible", -13.0781, -76.3788],
      ["Luis Quispe", "999333444", "ocupado", -13.0862, -76.3861],
      ["Ana Torres", "999555666", "disponible", -13.0914, -76.3722],
      ["Pedro Rojas", "999777888", "inactivo", -13.0723, -76.3956],
    ];
    for (const r of repartidores) insertRep.run(...r);
  }

  const pedCount = database.prepare("SELECT COUNT(*) AS n FROM pedidos").get() as { n: number };
  if (pedCount.n > 0) return;

  const insertPed = database.prepare(
    "INSERT INTO pedidos (codigo, descripcion, estado, repartidor_id, lat, lng) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const pedidos = [
    ["PED-1001", "2 pollos a la brasa + papas", "entregado", 1, -13.0795, -76.3812],
    ["PED-1002", "Parrillada familiar y gaseosa 1.5L", "asignado", 2, -13.0881, -76.3844],
    ["PED-1003", "Menú ejecutivo x2", "pendiente", null, -13.0932, -76.3755],
    ["PED-1004", "Chaufa de pollo y chicha", "en_camino", 3, -13.0827, -76.3711],
  ];
  for (const p of pedidos) insertPed.run(...p);
}

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  ensureSchema(db);
  seed(db);
  return db;
}
