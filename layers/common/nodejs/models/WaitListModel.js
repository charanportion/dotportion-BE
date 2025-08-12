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
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const WaitList = mongoose.model("Waitlist", waitlistSchema);

export default WaitList;
