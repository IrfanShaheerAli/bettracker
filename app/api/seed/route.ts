import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// Visit /api/seed once in your browser to create the first admin account.
// Safe to call more than once — it won't create duplicates.
export async function GET() {
  await connectToDatabase();

  const existingAdmin = await User.findOne({ username: "admin" });
  if (existingAdmin) {
    return NextResponse.json({ message: "Admin already exists, nothing to do." });
  }

  const admin = await User.create({
    name: "Admin",
    username: "admin",
    password: "admin123", // change this after first login — plain text for now
    role: "admin",
  });

  return NextResponse.json({ message: "Admin account created.", admin });
}
