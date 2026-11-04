import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Match from "@/models/Match";
import SideBet from "@/models/SideBet";
import SideBetAnswer from "@/models/SideBetAnswer";

type Entry = { net: number; settled: number; pending: number };

// For every match in a tournament, returns each person's combined side bet
// result:  { [matchId]: { [userId]: { net, settled, pending } } }
//   net     = total profit/loss across their side bets on that match
//             (only side bets the admin has already settled)
//   settled = how many of their side bets are settled
//   pending = how many are still waiting for the admin to declare an answer
// The leaderboard adds this onto the normal match bet result, so one column
// per match shows both together.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const matches = await Match.find({ tournamentId: id }).select("_id");
  const matchIds = matches.map((m) => m._id);

  const sideBets = await SideBet.find({ matchId: { $in: matchIds } });
  const matchOfSideBet = new Map<string, string>();
  for (const sb of sideBets) matchOfSideBet.set(String(sb._id), String(sb.matchId));

  const answers = await SideBetAnswer.find({
    sideBetId: { $in: sideBets.map((sb) => sb._id) },
  });

  const result: Record<string, Record<string, Entry>> = {};

  for (const a of answers) {
    const matchId = matchOfSideBet.get(String(a.sideBetId));
    if (!matchId) continue;

    const userId = String(a.userId);
    if (!result[matchId]) result[matchId] = {};
    if (!result[matchId][userId]) result[matchId][userId] = { net: 0, settled: 0, pending: 0 };

    const entry = result[matchId][userId];
    if (a.dividend === null || a.dividend === undefined) {
      entry.pending += 1;
    } else {
      entry.net += a.dividend;
      entry.settled += 1;
    }
  }

  // tidy floating-point noise like 46.67000000000001
  for (const matchId of Object.keys(result)) {
    for (const userId of Object.keys(result[matchId])) {
      result[matchId][userId].net = Math.round(result[matchId][userId].net * 100) / 100;
    }
  }

  return NextResponse.json(result);
}
