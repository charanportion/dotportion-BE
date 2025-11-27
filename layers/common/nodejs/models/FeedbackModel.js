import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["idea", "issue"],
      required: true,
      index: true,
    },
    title: { type: String },
    message: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    project: { type: String, index: true },
    service: { type: String, index: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    subject: { type: String },
    status: {
      type: String,
      enum: ["open", "triaged", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ type: 1, project: 1, severity: 1, status: 1 });

export default mongoose.model("Feedback", feedbackSchema);
