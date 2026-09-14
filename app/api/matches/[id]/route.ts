import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Match from "@/models/Match";
import Bet from "@/models/Bet";
import Tournament from "@/models/Tournament";
import Penalty from "@/models/Penalty";

// Fixed penalty amount for missing a bet on a joined tournament's match.
// Adjust this if your group wants a different amount.
const PENALTY_AMOUNT = 50;

function computePools(bets: { choice: string; stake: number }[]) {
  const pools = { A: 0, draw: 0, B: 0 };
  for (const b of bets) pools[b.choice as "A" | "draw" | "B"] += b.stake;
  const total = pools.A + pools.draw + pools.B;
  const oddsFor = (pool: number) => (pool > 0 ? Number(((total - pool) / pool).toFixed(2)) : null);
  return { pools, odds: { A: oddsFor(pools.A), draw: oddsFor(pools.draw), B: oddsFor(pools.B) } };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const bets = await Bet.find({ matchId: id });
  const { pools, odds } = computePools(bets);
  const penalties = await Penalty.find({ matchId: id }).populate("userId", "name username");

  return NextResponse.json({ ...match.toObject(), pools, odds, penalties });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const body = await req.json();

  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const wasOpen = match.bettingOpen;

  // --- 1. Toggle betting open/closed, and run penalty check if just closing ---
  if (typeof body.bettingOpen === "boolean") {
    match.bettingOpen = body.bettingOpen;

    const justClosed = wasOpen && body.bettingOpen === false;
    if (justClosed) {
      const tournament = await Tournament.findById(match.tournamentId);
      const bets = await Bet.find({ matchId: id });
      const betUserIds = new Set(bets.map((b) => String(b.userId)));

      if (tournament) {
        for (const participantId of tournament.participantIds) {
          const idStr = String(participantId);
          if (betUserIds.has(idStr)) continue;

          const alreadyPenalized = await Penalty.findOne({ userId: idStr, matchId: id });
          if (alreadyPenalized) continue;

          await Penalty.create({
            userId: idStr,
            matchId: id,
            tournamentId: match.tournamentId,
            amount: PENALTY_AMOUNT,
            reason: "Missed betting on a joined tournament's match",
          });
        }
      }
    }
  }

  // --- 2. Declare result and settle every bet's real dividend ---
  if (body.result) {
    match.result = body.result;
    match.status = "completed";

    const bets = await Bet.find({ matchId: id });
    const { odds } = computePools(bets);

    for (const bet of bets) {
      const won = bet.choice === body.result;
      const winOdds = odds[body.result as "A" | "draw" | "B"];
      bet.dividend = won && winOdds !== null ? Number((bet.stake * winOdds).toFixed(2)) : -bet.stake;
      await bet.save();
    }
  }

  await match.save();
  return NextResponse.json(match);
}
