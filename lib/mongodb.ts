import mongoose from "mongoose";

// Importing every model here (even unused in this file) guarantees Mongoose
// registers all schemas the moment the database connects — regardless of
// which API route happens to run first on a cold serverless instance.
// Without this, a route that only imports Tournament but calls
// .populate("participantIds", ...) can intermittently throw
// "MissingSchemaError: Schema hasn't been registered for model User"
// if it's the very first route to run in a fresh instance.
import "@/models/User";
import "@/models/Tournament";
import "@/models/Match";
import "@/models/Bet";
import "@/models/Penalty";
import "@/models/SideBet";
import "@/models/SideBetAnswer";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Missing MONGODB_URI — add it to your .env.local file (see .env.local.example)."
  );
}

// Cache the connection across hot-reloads in dev so we don't open a new
// connection every time a file is saved.
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

/* eslint-disable no-var */
declare global {
  var _mongooseCache: MongooseCache | undefined;
}
/* eslint-enable no-var */

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
