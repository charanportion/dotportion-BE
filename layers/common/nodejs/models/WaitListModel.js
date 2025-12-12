// models/Waitlist.js
import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected"],
      default: "requested",
    },
    type: {
      type: String,
      enum: ["waitlist", "invite"],
      default: "waitlist",
    },
    invited: { type: Boolean, default: false },
    inviteUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const WaitList = mongoose.model("Waitlist", waitlistSchema);

export default WaitList;
