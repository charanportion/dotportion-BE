import mongoose from "mongoose";

const userActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    action: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "warn", "error"],
      required: true,
    },
    metadata: {
      type: Object, // <--- fully flexible object
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: false, // allow flexible metadata
  }
);

export default mongoose.model("UserActivityLog", userActivityLogSchema);
