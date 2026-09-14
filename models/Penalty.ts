import { Schema, models, model, Types } from "mongoose";

const PenaltySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    matchId: { type: Types.ObjectId, ref: "Match", required: true },
    tournamentId: { type: Types.ObjectId, ref: "Tournament", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: "Missed betting on a joined tournament's match" },
  },
  { timestamps: true }
);

export default models.Penalty || model("Penalty", PenaltySchema);
