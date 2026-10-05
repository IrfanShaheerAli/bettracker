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

  const { name, startDate, endDate, bettingCutoffHours } = await req.json();

  if (!name?.trim() || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Name, start date, and end date are required." },
      { status: 400 }
    );
  }

  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "End date can't be before start date." }, { status: 400 });
  }

  const tournament = await Tournament.create({
    name: name.trim(),
    status: "upcoming",
    participantIds: [],
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    bettingCutoffHours: bettingCutoffHours ?? 2,
  });

  return NextResponse.json(tournament, { status: 201 });
}
