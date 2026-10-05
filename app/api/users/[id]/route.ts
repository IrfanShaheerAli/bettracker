import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Tournament from "@/models/Tournament";
import Bet from "@/models/Bet";
import Penalty from "@/models/Penalty";

// Permanently deletes the user, removes them from every tournament they were
// part of, and deletes their bets and penalties.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  await Tournament.updateMany(
    { participantIds: id },
    { $pull: { participantIds: id } }
  );
  await Bet.deleteMany({ userId: id });
  await Penalty.deleteMany({ userId: id });
  await User.findByIdAndDelete(id);

  return NextResponse.json({ deleted: true });
}
