import { Schema, models, model, Types } from "mongoose";

const SideBetAnswerSchema = new Schema(
  {
    sideBetId: { type: Types.ObjectId, ref: "SideBet", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    answer: { type: String, required: true }, // e.g. "0-0", "8", "Torres"
    dividend: { type: Number, default: null }, // filled in once the admin declares the correct answer
  },
  { timestamps: true }
);

// one answer per person per side bet — same "can't change a submitted bet" rule as main bets
SideBetAnswerSchema.index({ sideBetId: 1, userId: 1 }, { unique: true });

export default models.SideBetAnswer || model("SideBetAnswer", SideBetAnswerSchema);
