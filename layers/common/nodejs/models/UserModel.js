import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    authProvider: {
      type: String,
      required: true,
      enum: ["email", "google", "github"],
      default: "email",
    },
    picture: {
      type: String,
      required: false,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isNewUser: {
      type: Boolean,
      default: true,
    },
    access: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected"],
        default: "none",
      },
      source: {
        type: String,
        enum: ["waitlist", "invite"],
        default: "waitlist",
      },
      requestedAt: { type: Date },
      approvedAt: { type: Date },
      rejectedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    profile: {
      name: { type: String },
      contact_number: { type: String },
      occupation: { type: String },
      tools: [{ type: String }],
      experience_level: { type: String },
      subscription_tutorials: { type: Boolean, default: false },
      subscription_newsletter: { type: Boolean, default: false },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
    },
    tours: {
      sidebarMain: { type: Boolean, default: false },
      sidebarProject: { type: Boolean, default: false },
      workflowsTour: { type: Boolean, default: false },
      logsTour: { type: Boolean, default: false },
      schemaPageTour: { type: Boolean, default: false },
      projectTour: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1, name: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
