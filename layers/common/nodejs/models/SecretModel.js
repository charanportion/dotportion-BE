import mongoose from "mongoose";

const SecretSchema = new mongoose.Schema(
  {
    tenant: {
      type: String,
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    // key: {
    //   type: String,
    //   required: true,
    // },
    provider: {
      type: String,
      enum: ["mongodb", "supabase", "neondb", "jwt"], // extend as needed
      required: true,
    },
    data: {
      type: Object, // to store any shape of secrets like connection strings, tokens
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index: only one provider of each type per project
// SecretSchema.index({ project: 1, provider: 1 }, { unique: true });
// SecretSchema.index({ tenant: 1 });
// SecretSchema.index({ owner: 1 });

const Secret = mongoose.model("Secret", SecretSchema);

export default Secret;
