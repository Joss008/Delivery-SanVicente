import type { DatabaseSync } from "node:sqlite";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function botConfigurado(): boolean {
  return Boolean(BOT_TOKEN);
}

/**
 * Envía un mensaje HTML a un chat_id específico de Telegram.
 * Si el bot no está configurado o el chat_id falta, registra en consola y sale.
 */
export async function enviarAlertaTelegram(chatId: string | null | undefined, mensaje: string): Promise<void> {
  if (!botConfigurado()) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN no configurado. Mensaje omitido:", mensaje);
    return;
  }
  if (!chatId) {
    console.warn("[telegram] Sin chat_id. Mensaje omitido:", mensaje);
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: "HTML" }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[telegram] Error al enviar:", res.status, text);
      if (res.status === 403 || res.status === 400) {
        console.warn(
          `[telegram] El chat_id ${chatId} parece inválido o el usuario bloqueó al bot. Considera limpiarlo.`
        );
      }
    }
  } catch (err) {
    console.error("[telegram] Fallo al enviar alerta:", err);
  }
}

/**
 * Notifica a un repartidor específico buscándolo por id en la base de datos.
 * Si el repartidor no tiene telegram_chat_id configurado, se omite silenciosamente.
 */
export async function notificarRepartidor(
  db: DatabaseSync,
  repartidorId: number | null | undefined,
  mensaje: string
): Promise<void> {
  if (!repartidorId) return;
  const row = db
    .prepare("SELECT telegram_chat_id FROM repartidores WHERE id = ?")
    .get(repartidorId) as { telegram_chat_id: string | null } | undefined;
  if (!row?.telegram_chat_id) return;
  await enviarAlertaTelegram(row.telegram_chat_id, mensaje);
}

/**
 * Envía una notificación broadcast a todos los repartidores disponibles
 * que tengan telegram_chat_id configurado. Como los repartidores son
 * externos (no pertenecen a una empresa concreta), no se filtra por empresa.
 */
export async function notificarRepartidoresDisponibles(
  db: DatabaseSync,
  mensaje: string
): Promise<number> {
  if (!botConfigurado()) return 0;

  const where =
    "WHERE estado = 'disponible' AND telegram_chat_id IS NOT NULL AND telegram_chat_id != ''";

  const rows = db
    .prepare(`SELECT telegram_chat_id FROM repartidores ${where}`)
    .all() as { telegram_chat_id: string }[];

  await Promise.all(rows.map((r) => enviarAlertaTelegram(r.telegram_chat_id, mensaje)));
  return rows.length;
}
