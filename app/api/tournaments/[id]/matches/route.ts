import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Match from "@/models/Match";
import Bet from "@/models/Bet";
import Tournament from "@/models/Tournament";
import { computePools, syncAutoClose, isEffectivelyOpen, getCutoffTime } from "@/lib/matchLogic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const tournament = await Tournament.findById(id);
  const matches = await Match.find({ tournamentId: id }).sort({ kickoff: 1 });

  const withOdds = await Promise.all(
    matches.map(async (m) => {
      await syncAutoClose(m); // persists auto-close + penalties if the cutoff just passed

      const bets = await Bet.find({ matchId: m._id });
      const { pools, odds } = computePools(bets);
      const effectiveOpen = tournament ? isEffectivelyOpen(m, tournament) : m.bettingOpen;
      const cutoffTime = tournament ? getCutoffTime(m, tournament) : null;

      return { ...m.toObject(), pools, odds, effectiveOpen, cutoffTime };
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
