import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Match from "@/models/Match";
import Bet from "@/models/Bet";
import Penalty from "@/models/Penalty";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const tournament = await Tournament.findById(id).populate("participantIds", "name username");
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  return NextResponse.json(tournament);
}

// Body can include { status }, { addParticipantId }, or { removeParticipantId }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  const body = await req.json();

  const tournament = await Tournament.findById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  if (body.status) {
    tournament.status = body.status;
  }

  if (body.addParticipantId) {
    const alreadyIn = tournament.participantIds.some(
      (pId: unknown) => String(pId) === body.addParticipantId
    );
    if (!alreadyIn) {
      tournament.participantIds.push(body.addParticipantId);
    }
  }

  if (body.removeParticipantId) {
    tournament.participantIds = tournament.participantIds.filter(
      (pId: unknown) => String(pId) !== body.removeParticipantId
    );
  }

  await tournament.save();
  await tournament.populate("participantIds", "name username");

  return NextResponse.json(tournament);
}

// Permanently deletes the tournament AND everything inside it —
// its matches, every bet on those matches, and every penalty tied to it.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;

  const matches = await Match.find({ tournamentId: id });
  const matchIds = matches.map((m) => m._id);

  await Bet.deleteMany({ matchId: { $in: matchIds } });
  await Penalty.deleteMany({ tournamentId: id });
  await Match.deleteMany({ tournamentId: id });
  await Tournament.findByIdAndDelete(id);

  return NextResponse.json({ deleted: true });
}
