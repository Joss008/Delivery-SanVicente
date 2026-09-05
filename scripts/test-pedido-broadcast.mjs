// Simula la notificación de un nuevo pedido pendiente tal como lo haría
// POST /api/pedidos: broadcast a los repartidores disponibles con chat_id.
// Uso: node scripts/test-pedido-broadcast.mjs <empresa_id>

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (!existsSync(envPath)) {
  console.error("✗ No existe .env");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);
const token = env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("✗ TELEGRAM_BOT_TOKEN vacío");
  process.exit(1);
}

const db = new DatabaseSync("data/reparto.db");
const empresaId = Number(process.argv[2] ?? 2);

const codigo = "PD-TEST";
const msg = `🆕 Nuevo pedido <b>${codigo}</b>\nLa Casa del Pollo\n📍 Recojo: Av. Test 100\n🏠 Entrega: Jr. Test 200`;

const rows = db
  .prepare(
    "SELECT id, nombre, telegram_chat_id FROM repartidores WHERE estado = 'disponible' AND telegram_chat_id IS NOT NULL AND telegram_chat_id != '' AND empresa_id = ?"
  )
  .all(empresaId);

console.log(`→ Repartidores disponibles con chat_id en empresa ${empresaId}:`);
for (const r of rows) console.log(`  · ${r.nombre} (id ${r.id}) → chat_id ${r.telegram_chat_id}`);

if (rows.length === 0) {
  console.error("✗ No hay repartidores disponibles con chat_id en esta empresa.");
  process.exit(1);
}

for (const r of rows) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: r.telegram_chat_id, text: msg, parse_mode: "HTML" }),
  });
  const data = await res.json();
  console.log(`  · ${r.nombre}: ${res.ok && data.ok ? "✓ enviado" : "✗ " + JSON.stringify(data)}`);
}
