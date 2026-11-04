import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  // Telegram sends back the secret we gave it when we registered the webhook.
  // Anyone else calling this URL doesn't know it.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await req.json();
    const text: string = update?.message?.text ?? "";
    const chatId = update?.message?.chat?.id;
    if (!chatId || !text) return NextResponse.json({ ok: true }); // ignore anything that isn't a text message

    await connectToDatabase();
    const chat = String(chatId);
    const reply = (msg: string) => sendTelegramMessage(chat, msg);

    if (text.startsWith("/start")) {
      const token = text.split(/\s+/)[1];

      if (!token) {
        await reply("Hi! I send betting reminders for BetTracker. To connect, open the BetTracker site and tap “Connect Telegram”.");
      } else {
        const user = await User.findOne({ telegramLinkToken: token });
        if (!user) {
          await reply("That link has expired. Open BetTracker and tap “Connect Telegram” again.");
        } else {
          // one Telegram chat belongs to one BetTracker account
          await User.updateMany({ telegramChatId: chat }, { $set: { telegramChatId: null } });
          await User.updateOne(
            { _id: user._id },
            { $set: { telegramChatId: chat, telegramLinkToken: null } }
          );
          await reply(`✅ Connected, ${user.name}! I'll message you shortly before betting closes on a match you haven't bet on yet. Send /stop any time to turn this off.`);
        }
      }
    } else if (text.startsWith("/stop")) {
      const result = await User.updateMany({ telegramChatId: chat }, { $set: { telegramChatId: null } });
      await reply(result.modifiedCount ? "🔕 Reminders turned off. Tap “Connect Telegram” on BetTracker to turn them back on." : "No reminders were set up for this chat.");
    } else {
      await reply("I only send betting reminders. Use “Connect Telegram” on the BetTracker site to set them up, or /stop to turn them off.");
    }
  } catch (err) {
    // Always answer 200 — otherwise Telegram keeps retrying the same message.
    console.error("telegram webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
