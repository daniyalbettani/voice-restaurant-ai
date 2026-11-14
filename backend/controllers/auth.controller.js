import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendOTPEmail } from "../utils/email.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// In-memory OTP store — email → { otp, data, expiresAt }
const otpStore = new Map();

/**
 * @desc    Step 1: Request OTP for Registration
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Please Provide all fields!");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be atleast 6 character long!");
  }
  const normalizedEmail = email.toLowerCase().trim();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new ApiError(409, "An account with this email already exists!");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(normalizedEmail, {
    otp,
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone || "",
    },
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
  });

  try {
    await sendOTPEmail(normalizedEmail, otp, name);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "OTP sent to your email successfully!"));
  } catch (error) {
    otpStore.delete(normalizedEmail);
    console.log("Error sending email:", error);
    throw new ApiError(500, "Failed to send OTP. Please try again later.");
  }
});

/**
 * @desc    Step 2: Verify OTP and Save User to MongoDB
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP code are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    throw new ApiError(400, "No OTP found for this email. Please register again.");
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    throw new ApiError(400, "OTP code has expired. Please request a new one.");
  }

  if (record.otp !== otp.trim()) {
    throw new ApiError(400, "Incorrect OTP code. Please check your inbox and try again.");
  }

  const { name, password, phone } = record.data;
  otpStore.delete(normalizedEmail);

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  const role = normalizedEmail === superAdminEmail ? "super_admin" : "customer";

  try {
    const user = await User.create({ name, email: normalizedEmail, password, phone, role });

    const token = user.generateAccessToken();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    return res
      .status(201)
      .cookie("token", token, cookieOptions)
      .json(new ApiResponse(201, { user: userResponse, token }, "Account created successfully!"));
  } catch (error) {
    console.error("Error verifying OTP / creating user:", error);
    throw new ApiError(500, "Failed to create account. Please try again later.");
  }
});

/**
 * @desc    Login existing user & issue JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(404, "Invalid user credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const token = user.generateAccessToken();

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  return res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(200, { user: userResponse, token }, "User logged in successfully!"));
});

/**
 * @desc    Logout
 * @route   POST /api/auth/log-out
 * @access  Private
 */
export const logOut = asyncHandler(async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("token", cookieOptions)
    .json(new ApiResponse(200, null, "Logged Out Successfully!"));
});

/**
 * @desc    Get logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user is a full Mongoose doc set by verifyJWT — use _id
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(
    new ApiResponse(200, {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
    }, "User profile fetched")
  );
});

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const cleanEmail = email.toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ message: "No pending registration found. Please start over." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(cleanEmail, { ...record, otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    await sendOTPEmail(cleanEmail, otp, record.data.name);
    return res.status(200).json({ message: "New OTP sent to your email." });
  } catch (emailErr) {
    console.error("❌ Resend OTP Email Error:", emailErr.message);
    return res.status(500).json({ message: "Failed to resend OTP email." });
  }
});

/**
 * @desc    Update user profile (name, email, avatar)
 * @route   PATCH /api/auth/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, avatarUrl } = req.body;
  const user = await User.findById(req.user._id); // ← use _id
  if (!user) throw new ApiError(404, "User not found");

  if (name && name.trim() !== user.name) {
    if (user.nameChangedAt) {
      const daysSince = (Date.now() - new Date(user.nameChangedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        const daysLeft = Math.ceil(7 - daysSince);
        return res.status(400).json({ message: `You can change your name again in ${daysLeft} day(s)` });
      }
    }
    user.name = name.trim();
    user.nameChangedAt = new Date();
  }

  if (email && email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "This email is already in use by another account" });
    }
    user.email = email.toLowerCase();
  }

  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  await user.save();

  // Issue a fresh token with updated payload
  const token = user.generateAccessToken();

  return res.status(200).json({
    message: "Profile updated successfully",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      nameChangedAt: user.nameChangedAt,
    },
  });
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/account
 * @access  Private
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const target = await User.findById(req.user._id); // ← use _id
  if (!target) throw new ApiError(404, "User not found");

  if (target.role === "super_admin") {
    const subAdmin = await User.findOne({ role: "sub_admin" });
    if (subAdmin) {
      subAdmin.role = "super_admin";
      await subAdmin.save();
      console.log(`👑 Sub admin ${subAdmin.email} promoted to Super Admin.`);
    }
  }

  await User.findByIdAndDelete(req.user._id);
  return res.status(200).json({ message: "Account deleted successfully" });
});

/**
 * @desc    Get all users (Super Admin)
 * @route   GET /api/auth/admin/users
 * @access  Super Admin
 */
export const getAdminUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  return res.status(200).json(users);
});

/**
 * @desc    Update user role (Super Admin)
 * @route   PATCH /api/auth/admin/users/:id/role
 * @access  Super Admin
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["customer", "staff", "sub_admin"].includes(role)) {
    return res.status(400).json({ message: "Role must be customer, staff or sub_admin" });
  }

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.role === "super_admin") {
    return res.status(403).json({ message: "Cannot change super admin role" });
  }

  target.role = role;
  await target.save();
  return res.status(200).json({ message: `Role updated to ${role}`, user: target });
});
