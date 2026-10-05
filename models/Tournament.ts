import { Schema, models, model, Types } from "mongoose";

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["upcoming", "active", "completed"], default: "upcoming" },
    participantIds: [{ type: Types.ObjectId, ref: "User" }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // how many hours before a match's kickoff betting auto-closes, per tournament
    bettingCutoffHours: { type: Number, default: 2 },
  },
  { timestamps: true }
);

export default models.Tournament || model("Tournament", TournamentSchema);
