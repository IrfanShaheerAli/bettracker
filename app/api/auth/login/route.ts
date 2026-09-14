import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = await User.findOne({ username: username.toLowerCase() });

  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }

  return NextResponse.json({
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
  });
}
