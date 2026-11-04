import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Match from "@/models/Match";
import Bet from "@/models/Bet";
import User from "@/models/User";
import Reminder from "@/models/Reminder";
import { getCutoffTime } from "@/lib/matchLogic";
import { sendTelegramMessage } from "@/lib/telegram";

// People get one reminder when betting is this many hours (or less) from closing.
const REMINDER_LEAD_HOURS = 2;

// Times in the message are shown in this timezone (the server itself runs in UTC).
const TIMEZONE = process.env.REMINDER_TIMEZONE || "Asia/Kolkata";

function formatClosingTime(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  };
  try {
    return date.toLocaleString("en-IN", { ...options, timeZone: TIMEZONE });
  } catch {
    return date.toLocaleString("en-IN", { ...options, timeZone: "UTC" }) + " UTC";
  }
}

function formatTimeLeft(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// Called every few minutes by a scheduler (see .github/workflows/reminders.yml).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const now = new Date();
  const siteUrl = req.nextUrl.origin;
  const summary = { matchesInWindow: 0, sent: 0, failed: 0 };

  // only tournaments that have started and aren't finished
  const tournaments = await Tournament.find({ status: { $ne: "completed" }, startDate: { $lte: now } });

  for (const tournament of tournaments) {
    // only matches the admin has opened for betting and that haven't been settled
    const matches = await Match.find({ tournamentId: tournament._id, bettingOpen: true, result: null });

    for (const match of matches) {
      const cutoff = getCutoffTime(match, tournament);
      const msLeft = cutoff.getTime() - now.getTime();
      if (msLeft <= 0 || msLeft > REMINDER_LEAD_HOURS * 3600 * 1000) continue; // not in the window
      summary.matchesInWindow++;

      const [bets, reminded] = await Promise.all([
        Bet.find({ matchId: match._id }).select("userId"),
        Reminder.find({ matchId: match._id }).select("userId"),
      ]);
      const alreadyBet = new Set(bets.map((b: { userId: unknown }) => String(b.userId)));
      const alreadyReminded = new Set(reminded.map((r: { userId: unknown }) => String(r.userId)));

      const people = await User.find({
        _id: { $in: tournament.participantIds },
        telegramChatId: { $ne: null },
      }).select("+telegramChatId");

      const text =
        `⏰ Betting closes soon!\n\n` +
        `${match.teamA} vs ${match.teamB} (${tournament.name})\n` +
        `Closes in about ${formatTimeLeft(msLeft)} — at ${formatClosingTime(cutoff)}.\n\n` +
        `You haven't placed your bet on this match yet.\n` +
        `Open BetTracker: ${siteUrl}`;

      for (const person of people) {
        const id = String(person._id);
        if (alreadyBet.has(id) || alreadyReminded.has(id)) continue;

        const result = await sendTelegramMessage(person.telegramChatId, text);
        if (result.ok) {
          summary.sent++;
          await Reminder.create({ userId: person._id, matchId: match._id }).catch(() => {});
        } else {
          summary.failed++;
          // they blocked the bot — stop trying until they connect again
          if (result.blocked) {
            await User.updateOne({ _id: person._id }, { $set: { telegramChatId: null } });
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
