import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// Is this person connected?
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  await connectToDatabase();
  const user = await User.findById(userId).select("+telegramChatId");
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ connected: !!user.telegramChatId });
}

// Make a one-time link that opens the bot with this person's token.
export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return NextResponse.json(
      { error: "Telegram reminders aren't set up yet — ask your admin." },
      { status: 503 }
    );
  }
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  await connectToDatabase();
  const token = crypto.randomBytes(16).toString("hex");
  const result = await User.updateOne({ _id: userId }, { $set: { telegramLinkToken: token } });
  if (!result.matchedCount) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ link: `https://t.me/${botUsername.replace(/^@/, "")}?start=${token}` });
}

// Turn reminders off.
export async function DELETE(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  await connectToDatabase();
  await User.updateOne({ _id: userId }, { $set: { telegramChatId: null, telegramLinkToken: null } });
  return NextResponse.json({ connected: false });
}
