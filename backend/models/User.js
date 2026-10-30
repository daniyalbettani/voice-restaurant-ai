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
      rquired: [true, "password is required"],
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "staff", "sub_admin", "sup_admin"],
      default: "customer",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    nameChangeAt: {
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

  // hash the password using 10 round of salt
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    // yaha this refer kar raha hai us user document ko jo es function ko call kar rha hai,
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
};

export const User = mongoose.model("User", userSchema);

// The Complete Flow Summarized
// You pass plain user data into User.create().

// Mongoose holds that data in Node's RAM memory as a JavaScript object.

// The pre("save") hook intercepts that JavaScript object before network transmission.

// this.password inside the hook points directly to the plain password in RAM and replaces it with the bcrypt hash.

// next() releases the modified object.

// Mongoose writes the modified object (with the hashed password) to MongoDB.
