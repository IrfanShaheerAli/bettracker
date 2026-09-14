import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Bet from "@/models/Bet";

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

  if (!userId || !choice || !stake || stake <= 0) {
    return NextResponse.json(
      { error: "userId, choice, and a positive stake are required." },
      { status: 400 }
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
