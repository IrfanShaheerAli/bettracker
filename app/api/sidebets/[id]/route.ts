import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SideBet from "@/models/SideBet";
import SideBetAnswer from "@/models/SideBetAnswer";
import Match from "@/models/Match";
import Tournament from "@/models/Tournament";
import { getCutoffTime } from "@/lib/matchLogic";

// "Torres", " torres ", and "TORRES" should all count as the same answer.
function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const sideBet = await SideBet.findById(id);
  if (!sideBet) {
    return NextResponse.json({ error: "Side bet not found." }, { status: 404 });
  }

  const match = await Match.findById(sideBet.matchId);
  const tournament = match ? await Tournament.findById(match.tournamentId) : null;
  const cutoffTime = match && tournament ? getCutoffTime(match, tournament) : null;

  const answers = await SideBetAnswer.find({ sideBetId: id }).populate("userId", "name username");

  return NextResponse.json({ ...sideBet.toObject(), answers, cutoffTime });
}

// Declaring the correct answer settles every submitted answer for real,
// splitting the losers' total stake among everyone who guessed correctly —
// same pool formula as the main A/Draw/B bets, just keyed by a case- and
// whitespace-insensitive string match ("Torres" == "torres" == " torres ").
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const { correctAnswer } = await req.json();

  if (!correctAnswer?.trim()) {
    return NextResponse.json({ error: "A correct answer is required." }, { status: 400 });
  }

  const sideBet = await SideBet.findById(id);
  if (!sideBet) {
    return NextResponse.json({ error: "Side bet not found." }, { status: 404 });
  }

  sideBet.correctAnswer = correctAnswer.trim();
  await sideBet.save();

  const answers = await SideBetAnswer.find({ sideBetId: id });
  const normalizedCorrect = normalize(sideBet.correctAnswer);
  const totalPool = answers.length * sideBet.stake;
  const winners = answers.filter((a) => normalize(a.answer) === normalizedCorrect);
  const winnerPool = winners.length * sideBet.stake;

  for (const a of answers) {
    if (normalize(a.answer) === normalizedCorrect && winnerPool > 0) {
      const odds = (totalPool - winnerPool) / winnerPool;
      a.dividend = Number((sideBet.stake * odds).toFixed(2));
    } else {
      a.dividend = -sideBet.stake;
    }
    await a.save();
  }

  return NextResponse.json({ sideBet, settledCount: answers.length });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  await SideBetAnswer.deleteMany({ sideBetId: id });
  await SideBet.findByIdAndDelete(id);

  return NextResponse.json({ deleted: true });
}
