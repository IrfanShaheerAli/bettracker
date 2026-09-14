import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

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

// Body can include either { status } or { addParticipantId }
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

  await tournament.save();
  await tournament.populate("participantIds", "name username");

  return NextResponse.json(tournament);
}
