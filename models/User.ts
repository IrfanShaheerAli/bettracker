import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // plain for now — hashing comes with real auth
    role: { type: String, enum: ["admin", "participant"], default: "participant" },

    // Telegram reminders. select:false keeps these out of every normal query
    // (like the admin's user list) — code that needs them asks for them explicitly.
    telegramChatId: { type: String, default: null, select: false },
    telegramLinkToken: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
