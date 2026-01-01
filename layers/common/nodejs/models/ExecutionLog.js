import mongoose from "mongoose";

const nodeLogSchema = new mongoose.Schema(
  {
    // A unique identifier for the node from the workflow definition (e.g., 'node_1', 'startNode').
    nodeId: {
      type: String,
      required: true,
    },
    // A human-readable name for the node (e.g., "Fetch User Data", "Send Email").
    nodeName: {
      type: String,
      required: true,
    },
    // The status of this specific node's execution.
    status: {
      type: String,
      enum: ["success", "fail", "running", "skipped"],
      required: true,
    },
    // The input data passed to this node. Stored for debugging.
    input: {
      type: mongoose.Schema.Types.Mixed,
    },
    // The output data produced by this node.
    output: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Stores detailed error information if the node fails.
    error: {
      message: String,
      stack: String,
      details: mongoose.Schema.Types.Mixed,
    },
    // Timestamps for tracking individual node performance.
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
    // Duration of the node's execution in milliseconds.
    durationMs: {
      type: Number,
    },
  },
  { _id: false } // _id is not needed for sub-documents in this case.
);

const executionLogSchema = new mongoose.Schema(
  {
    // Reference to the project this execution belongs to.
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    // Reference to the workflow that was executed.
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
      index: true,
    },
    // The overall status of the entire workflow run.
    status: {
      type: String,
      enum: ["running", "success", "fail", "warning"],
      required: true,
    },
    // Details of the initial trigger (e.g., HTTP request).
    trigger: {
      type: {
        type: String,
        enum: ["api", "manual", "scheduled"],
        default: "api",
      },
      // Stores HTTP headers, body, query params etc. for API triggers.
      request: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    // The final output of the entire workflow (e.g., the HTTP response sent back).
    response: {
      statusCode: Number,
      body: mongoose.Schema.Types.Mixed,
    },
    // Array of logs for each node executed in the workflow.
    steps: [nodeLogSchema],
    // Total duration of the workflow execution in milliseconds.
    durationMs: Number,
    expireAt: {
      type: Date,
      required: true,
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields.
    timestamps: true,
  }
);

// This TTL (Time-To-Live) index automatically deletes log documents after 7 days (604800 seconds).
// This implements your log retention policy directly in the database.
// executionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
executionLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Compound index to improve query performance for fetching logs for a specific workflow.
executionLogSchema.index({ project: 1, workflow: 1, createdAt: -1 });

export default mongoose.model("ExecutionLog", executionLogSchema);
