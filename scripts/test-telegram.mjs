// Script de verificación para Telegram.
// Uso: node scripts/test-telegram.mjs <chat_id>
// Lee TELEGRAM_BOT_TOKEN desde .env y envía un mensaje de prueba al chat_id.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (!existsSync(envPath)) {
  console.error("✗ No existe .env. Copia .env.example → .env y completa TELEGRAM_BOT_TOKEN.");
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
const chatId = process.argv[2] ?? env.TELEGRAM_CHAT_ID;

if (!token) {
  console.error("✗ TELEGRAM_BOT_TOKEN vacío en .env");
  process.exit(1);
}
if (!chatId) {
  console.error("✗ Pasa el chat_id como argumento: node scripts/test-telegram.mjs 123456789");
  process.exit(1);
}

console.log(`→ Bot token: ${token.slice(0, 6)}…${token.slice(-4)}`);
console.log(`→ Destino:   ${chatId}`);
console.log("→ Enviando mensaje de prueba…");

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: chatId,
    text: "✅ Bot de Reparto Cañete conectado. Si ves esto, las notificaciones funcionarán.",
  }),
});

const data = await res.json();
if (!res.ok || !data.ok) {
  console.error("✗ Telegram rechazó el envío:");
  console.error(JSON.stringify(data, null, 2));
  if (res.status === 401) console.error("  El bot token es inválido o fue revocado.");
  if (res.status === 400 || res.status === 403)
    console.error("  El chat_id es incorrecto, o el usuario aún no escribió /start al bot.");
  process.exit(1);
}

console.log("✓ Mensaje enviado. Revisa tu Telegram.");
