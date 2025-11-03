import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    cognitoSub: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    onboarding: {
      role: { type: String },
      company_size: { type: String },
      referral_source: { type: String },
      goals: [{ type: String }],
      experience_level: { type: String },
    },
    profile: {
      name: { type: String },
      contact_number: { type: String },
      experience_level: { type: String },
      tools: [{ type: String }],
      subscription_tutorials: { type: Boolean, default: false },
      subscription_newsletter: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure email is unique
userSchema.index({ email: 1, name: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
