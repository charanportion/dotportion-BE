import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workflows: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workflow",
      },
    ],
    secrets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Secret",
      },
    ],
    cors: {
      enabled: {
        type: Boolean,
        default: false,
      },
      allowedOrigins: {
        type: [String],
        default: ["*"], // default: allow all origins
      },
      allowedMethods: {
        type: [String],
        default: ["GET", "POST", "PUT", "DELETE"],
      },
      allowedHeaders: {
        type: [String],
        default: ["Content-Type", "Authorization"],
      },
    },
    rateLimit: {
      enabled: {
        type: Boolean,
        default: false,
      },
      windowMs: {
        type: Number,
        default: 15 * 60 * 1000, // 15 minutes
      },
      max: {
        type: Number,
        default: 100, // limit each IP to 100 requests per windowMs
      },
      message: {
        type: String,
        default: "Too many requests, please try again later.",
      },
      standardHeaders: {
        type: Boolean,
        default: true, // Return rate limit info in the `RateLimit-*` headers
      },
      legacyHeaders: {
        type: Boolean,
        default: false, // Disable the `X-RateLimit-*` headers
      },
    },
    stats: {
      totalApiCalls: {
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
      topWorkflows: [
        {
          workflowId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workflow",
          },
          calls: Number,
        },
      ],
    },
  },
  { timestamps: true }
);

// Index for faster queries
projectSchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model("Project", projectSchema);
