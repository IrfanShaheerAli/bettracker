import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

export async function GET() {
  await connectToDatabase();
  const tournaments = await Tournament.find().populate("participantIds", "name username");
  return NextResponse.json(tournaments);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Tournament name is required." }, { status: 400 });
  }

  const tournament = await Tournament.create({
    name: name.trim(),
    status: "upcoming",
    participantIds: [],
  });

  return NextResponse.json(tournament, { status: 201 });
}
