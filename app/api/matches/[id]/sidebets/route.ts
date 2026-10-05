import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SideBet from "@/models/SideBet";
import SideBetAnswer from "@/models/SideBetAnswer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const sideBets = await SideBet.find({ matchId: id }).sort({ createdAt: 1 });

  // attach each side bet's pool total and answer count so the UI can show
  // a quick summary without a second round trip
  const withCounts = await Promise.all(
    sideBets.map(async (sb) => {
      const answers = await SideBetAnswer.find({ sideBetId: sb._id });
      return { ...sb.toObject(), answerCount: answers.length, pool: answers.length * sb.stake };
    })
  );

  return NextResponse.json(withCounts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const { label, stake } = await req.json();

  if (!label?.trim() || !stake || stake <= 0) {
    return NextResponse.json(
      { error: "A label and a positive stake are required." },
      { status: 400 }
    );
  }

  const sideBet = await SideBet.create({
    matchId: id,
    label: label.trim(),
    stake,
    correctAnswer: null,
  });

  return NextResponse.json(sideBet, { status: 201 });
}
