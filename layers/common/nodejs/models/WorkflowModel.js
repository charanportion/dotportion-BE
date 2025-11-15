import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    },
    path: {
      type: String,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    tenant: {
      type: String,
      required: true,
    },
    isDeployed: {
      type: Boolean,
      default: false,
    },
    nodes: [
      {
        id: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        data: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        position: {
          x: Number,
          y: Number,
        },
      },
    ],
    edges: [
      {
        id: {
          type: String,
          required: true,
        },
        source: {
          type: String,
          required: true,
        },
        target: {
          type: String,
          required: true,
        },
        sourceHandle: {
          type: String,
          required: false, // Optional
        },
        targetHandle: {
          type: String,
          required: false, // Optional
        },
      },
    ],
    stats: {
      totalCalls: {
        type: Number,
        default: 0,
      },
      successCalls: {
        type: Number,
        default: 0,
      },
      failedCalls: {
        type: Number,
        default: 0,
      },
      avgResponseTime: {
        type: Number,
        default: 0,
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ["private", "unlisted", "public"],
      default: "private",
    },
    forkedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      default: null,
    },
    forkCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

workflowSchema.index({ isPublic: 1, forkCount: -1 });
workflowSchema.index({ owner: 1 });
workflowSchema.index({ forkedFrom: 1 });

export default mongoose.model("Workflow", workflowSchema);
