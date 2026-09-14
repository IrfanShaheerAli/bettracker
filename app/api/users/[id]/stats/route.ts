import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Bet from "@/models/Bet";
import Penalty from "@/models/Penalty";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const [bets, penalties] = await Promise.all([
    Bet.find({ userId: id }),
    Penalty.find({ userId: id }),
  ]);

  // dividend is null until a match's result is declared and settlement runs —
  // pending bets contribute 0 until then, which is correct.
  const winningsFromBets = bets.reduce((sum, b) => sum + (b.dividend ?? 0), 0);
  const penaltyTotal = penalties.reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    netWinnings: winningsFromBets - penaltyTotal,
    betsPlaced: bets.length,
    penaltiesCount: penalties.length,
  });
}
