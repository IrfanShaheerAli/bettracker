import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Bet from "@/models/Bet";
import Penalty from "@/models/Penalty";
import SideBetAnswer from "@/models/SideBetAnswer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const [bets, penalties, sideAnswers] = await Promise.all([
    Bet.find({ userId: id }),
    Penalty.find({ userId: id }),
    SideBetAnswer.find({ userId: id }),
  ]);

  // dividend is null until the result is declared and settlement runs —
  // pending bets contribute 0 until then, which is correct.
  const winningsFromBets = bets.reduce((sum, b) => sum + (b.dividend ?? 0), 0);
  const winningsFromSideBets = sideAnswers.reduce((sum, a) => sum + (a.dividend ?? 0), 0);
  const penaltyTotal = penalties.reduce((sum, p) => sum + p.amount, 0);

  const netWinnings = winningsFromBets + winningsFromSideBets - penaltyTotal;

  return NextResponse.json({
    // rounded to tidy floating-point noise like 46.67000000000001
    netWinnings: Math.round(netWinnings * 100) / 100,
    betsPlaced: bets.length,
    penaltiesCount: penalties.length,
  });
}
