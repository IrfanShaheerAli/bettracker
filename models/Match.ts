import { Schema, models, model, Types } from "mongoose";

const MatchSchema = new Schema(
  {
    tournamentId: { type: Types.ObjectId, ref: "Tournament", required: true },
    teamA: { type: String, required: true },
    teamB: { type: String, required: true },
    kickoff: { type: Date, required: true },
    bettingOpen: { type: Boolean, default: false },
    status: { type: String, enum: ["upcoming", "live", "completed"], default: "upcoming" },
    result: { type: String, enum: ["A", "draw", "B", null], default: null },
  },
  { timestamps: true }
);

export default models.Match || model("Match", MatchSchema);
