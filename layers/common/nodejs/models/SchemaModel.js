import mongoose, { Schema, Document, Types } from "mongoose";

const PositionSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false }
);

const FieldSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    handleType: {
      type: String,
      required: true,
      enum: ["source", "target", "both", "none"],
    },
    required: { type: Boolean, default: false },
    unique: { type: Boolean, default: false },
    index: { type: Boolean, default: false },
  },
  { _id: false }
);

const NodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    position: { type: PositionSchema, required: true },
    fields: { type: [FieldSchema], required: true },
  },
  { _id: false }
);

const EdgeSchema = new Schema(
  {
    id: { type: String, required: true },
    sourceNode: { type: String, required: true },
    targetNode: { type: String, required: true },
    sourceHandle: { type: String, required: true },
    targetHandle: { type: String, required: true },
  },
  { _id: false }
);

const SchemaSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    dataBase: {
      type: String,
      required: true,
      enum: ["mongodb", "platform"],
    },
    owner: {
      type: String,
      required: true,
    },
    nodes: {
      type: [NodeSchema],
      required: true,
      default: [],
    },
    edges: {
      type: [EdgeSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

SchemaSchema.index({ owner: 1, createdAt: -1 });
SchemaSchema.index({ projectId: 1, owner: 1 });

export default mongoose.model("Schema", SchemaSchema);
