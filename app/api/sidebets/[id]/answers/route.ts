import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SideBet from "@/models/SideBet";
import SideBetAnswer from "@/models/SideBetAnswer";
import Match from "@/models/Match";
import Tournament from "@/models/Tournament";
import { isCutoffPassed } from "@/lib/matchLogic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const answers = await SideBetAnswer.find({ sideBetId: id }).populate("userId", "name username");
  return NextResponse.json(answers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const { userId, answer } = await req.json();

  if (!userId || !answer?.trim()) {
    return NextResponse.json({ error: "userId and an answer are required." }, { status: 400 });
  }

  const sideBet = await SideBet.findById(id);
  if (!sideBet) {
    return NextResponse.json({ error: "Side bet not found." }, { status: 404 });
  }

  const match = await Match.findById(sideBet.matchId);
  const tournament = match ? await Tournament.findById(match.tournamentId) : null;

  if (match && tournament && isCutoffPassed(match, tournament)) {
    return NextResponse.json(
      { error: "Betting has closed for this match — side bets close at the same deadline." },
      { status: 400 }
    );
  }

  try {
    const created = await SideBetAnswer.create({
      sideBetId: id,
      userId,
      answer: answer.trim(),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return NextResponse.json(
        { error: "You've already answered this side bet." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not submit answer." }, { status: 500 });
  }
}
