import { Schema, models, model, Types } from "mongoose";

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["upcoming", "active", "completed"], default: "upcoming" },
    participantIds: [{ type: Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default models.Tournament || model("Tournament", TournamentSchema);
