import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    nameChangedAt: { type: Date, default: null },
    role: {
      type: String,
      enum: ["customer", "staff", "sub_admin", "super_admin"],
      default: "customer",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
