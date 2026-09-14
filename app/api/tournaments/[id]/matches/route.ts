import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Match from "@/models/Match";
import Bet from "@/models/Bet";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const matches = await Match.find({ tournamentId: id }).sort({ kickoff: 1 });

  // For each match, pull its bets and compute live pool odds:
  // odds_X = (totalPool - poolX) / poolX  — same formula as the real spreadsheet.
  const withOdds = await Promise.all(
    matches.map(async (m) => {
      const bets = await Bet.find({ matchId: m._id });

      const pools = { A: 0, draw: 0, B: 0 };
      for (const b of bets) pools[b.choice as "A" | "draw" | "B"] += b.stake;

      const total = pools.A + pools.draw + pools.B;
      const oddsFor = (pool: number) => (pool > 0 ? Number(((total - pool) / pool).toFixed(2)) : null);

      return {
        ...m.toObject(),
        pools,
        odds: { A: oddsFor(pools.A), draw: oddsFor(pools.draw), B: oddsFor(pools.B) },
      };
    })
  );

  return NextResponse.json(withOdds);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const { teamA, teamB, kickoff } = await req.json();

  if (!teamA?.trim() || !teamB?.trim() || !kickoff) {
    return NextResponse.json(
      { error: "Team A, Team B, and kickoff time are required." },
      { status: 400 }
    );
  }

  const match = await Match.create({
    tournamentId: id,
    teamA: teamA.trim(),
    teamB: teamB.trim(),
    kickoff: new Date(kickoff),
    bettingOpen: false,
    status: "upcoming",
  });

  return NextResponse.json(match, { status: 201 });
}
