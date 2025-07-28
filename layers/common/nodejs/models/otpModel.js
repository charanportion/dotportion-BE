import mongoose from "mongoose";

const otpSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    context: {
      type: String,
      enum: ["REGISTER", "FORGOT_PASSWORD"],
      default: "REGISTER",
    },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
