import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      lowerCase: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "staff", "sub_admin", "super_admin"],
      default: "customer",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    nameChangedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Mongoose Pre-Save hook for password hashing
userSchema.pre("save", async function () {
  // only hash the password if it was actually created or modified
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      name: this.name,
    },
    process.env.JWT_SECRET_KEY,
    // 30 days — long enough that users never see "jwt expired" mid-session
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" },
  );
};

export const User = mongoose.model("User", userSchema);
