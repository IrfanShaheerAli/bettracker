import { NextRequest, NextResponse } from "next/server";

// Open this once in your browser after deploying:
//   https://YOUR-SITE/api/telegram/setup?key=YOUR_CRON_SECRET
// It tells Telegram where to send messages people write to the bot.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) {
    return NextResponse.json(
      { error: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET first, then redeploy." },
      { status: 400 }
    );
  }

  const webhookUrl = `${req.nextUrl.origin}/api/telegram/webhook`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret, allowed_updates: ["message"] }),
  });

  return NextResponse.json({ webhookUrl, telegram: await res.json() });
}
