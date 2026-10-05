import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Bet from "@/models/Bet";
import Match from "@/models/Match";
import Tournament from "@/models/Tournament";
import { isEffectivelyOpen } from "@/lib/matchLogic";

const MIN_STAKE = 20;
const STAKE_STEP = 5;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const bets = await Bet.find({ matchId: id }).populate("userId", "name username");
  return NextResponse.json(bets);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const { userId, choice, stake } = await req.json();

  if (!userId || !choice || !stake) {
    return NextResponse.json({ error: "userId, choice, and stake are required." }, { status: 400 });
  }

  if (stake < MIN_STAKE) {
    return NextResponse.json({ error: `Minimum stake is ₹${MIN_STAKE}.` }, { status: 400 });
  }

  if (stake % STAKE_STEP !== 0) {
    return NextResponse.json({ error: `Stake must be in multiples of ₹${STAKE_STEP}.` }, { status: 400 });
  }

  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const tournament = await Tournament.findById(match.tournamentId);
  const open = tournament ? isEffectivelyOpen(match, tournament) : match.bettingOpen;

  if (!open) {
    return NextResponse.json(
      { error: "Betting is closed for this match — the deadline has passed." },
      { status: 403 }
    );
  }

  try {
    const bet = await Bet.create({ userId, matchId: id, choice, stake });
    return NextResponse.json(bet, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return NextResponse.json(
        { error: "You've already placed a bet on this match." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not place bet." }, { status: 500 });
  }
}
