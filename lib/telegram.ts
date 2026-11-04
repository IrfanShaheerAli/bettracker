// Sends one Telegram message. Never throws: it reports what happened instead.
export type SendResult =
  | { ok: true }
  | { ok: false; blocked: boolean; error: string };

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, blocked: false, error: "TELEGRAM_BOT_TOKEN is not set" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));
    const description: string = data?.description ?? `HTTP ${res.status}`;
    // 403 = the person blocked the bot (or deleted the chat). Stop messaging them.
    const blocked = res.status === 403 || (res.status === 400 && /chat not found/i.test(description));
    return { ok: false, blocked, error: description };
  } catch (err) {
    return { ok: false, blocked: false, error: err instanceof Error ? err.message : "network error" };
  }
}
