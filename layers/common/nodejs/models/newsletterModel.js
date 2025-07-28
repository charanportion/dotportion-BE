import mongoose from "mongoose";

const newsLetterSchema = new mongoose.Schema(
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
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
    },
    emails_sent: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const Newsletter = mongoose.model("NewsLetter", newsLetterSchema);

export default Newsletter;
