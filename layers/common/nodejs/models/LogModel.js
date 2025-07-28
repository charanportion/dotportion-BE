import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
    },
    status: {
      type: String,
      enum: ["success", "error"],
      required: true,
    },
    request: {
      type: mongoose.Schema.Types.Mixed, // store headers, body, query
    },
    response: {
      type: mongoose.Schema.Types.Mixed, // statusCode, body
    },
    durationMs: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

logSchema.index({ project: 1, workflow: 1, timestamp: -1 });

export default mongoose.model("Log", logSchema);
