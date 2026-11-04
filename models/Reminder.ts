import { Schema, models, model, Types } from "mongoose";

// One row = "this person was already reminded about this match", so nobody
// gets the same reminder twice.
const ReminderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    matchId: { type: Types.ObjectId, ref: "Match", required: true },
  },
  { timestamps: true }
);

ReminderSchema.index({ userId: 1, matchId: 1 }, { unique: true });

export default models.Reminder || model("Reminder", ReminderSchema);
