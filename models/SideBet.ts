import { Schema, models, model, Types } from "mongoose";

const SideBetSchema = new Schema(
  {
    matchId: { type: Types.ObjectId, ref: "Match", required: true },
    label: { type: String, required: true }, // e.g. "HT Score ARG - ESP", "Top Scorer"
    stake: { type: Number, required: true, min: 1 }, // flat stake per person, same for everyone
    correctAnswer: { type: String, default: null }, // set by admin once known — null means not settled yet
  },
  { timestamps: true }
);

export default models.SideBet || model("SideBet", SideBetSchema);
