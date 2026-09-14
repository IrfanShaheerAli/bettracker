import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  await connectToDatabase();
  const users = await User.find().select("-password");
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const { name, username, password } = await req.json();

  if (!name || !username || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const user = await User.create({
    name,
    username: username.toLowerCase(),
    password,
    role: "participant",
  });

  return NextResponse.json({ id: user._id, name: user.name, username: user.username }, { status: 201 });
}
