import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Match from "@/models/Match";
import Bet from "@/models/Bet";
import Tournament from "@/models/Tournament";
import Penalty from "@/models/Penalty";
import { computePools, syncAutoClose, isEffectivelyOpen, getCutoffTime, penalizeNoShows } from "@/lib/matchLogic";

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

  const tournament = await Tournament.findById(match.tournamentId);
  if (tournament) await syncAutoClose(match);

  const bets = await Bet.find({ matchId: id });
  const { pools, odds } = computePools(bets);
  const penalties = await Penalty.find({ matchId: id }).populate("userId", "name username");
  const effectiveOpen = tournament ? isEffectivelyOpen(match, tournament) : match.bettingOpen;
  const cutoffTime = tournament ? getCutoffTime(match, tournament) : null;

  return NextResponse.json({ ...match.toObject(), pools, odds, penalties, effectiveOpen, cutoffTime });
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
      await penalizeNoShows(id, String(match.tournamentId));
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

// Permanently deletes the match, along with every bet and penalty tied to it.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  await Bet.deleteMany({ matchId: id });
  await Penalty.deleteMany({ matchId: id });
  await Match.findByIdAndDelete(id);

  return NextResponse.json({ deleted: true });
}
