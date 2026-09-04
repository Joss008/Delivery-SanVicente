const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function enviarAlertaTelegram(mensaje: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[telegram] No configurado. Mensaje omitido:", mensaje);
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, parse_mode: "HTML" }),
    });

    if (!res.ok) {
      console.error("[telegram] Error al enviar:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[telegram] Fallo al enviar alerta:", err);
  }
}
