import { Schema, models, model, Types } from "mongoose";

const BetSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    matchId: { type: Types.ObjectId, ref: "Match", required: true },
    choice: { type: String, enum: ["A", "draw", "B"], required: true },
    stake: { type: Number, required: true, min: 1 },
    // dividend is computed and filled in once the match result is known
    dividend: { type: Number, default: null },
  },
  { timestamps: true }
);

// one bet per user per match — matches your rule that a bet can't be changed
BetSchema.index({ userId: 1, matchId: 1 }, { unique: true });

export default models.Bet || model("Bet", BetSchema);
