import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendOTPEmail } from "../utils/email.js";
import { authMiddleware, superAdminMiddleware } from "../middlewares/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "voicebite_secret_2024";

// In-memory OTP store — email → { otp, data, expiresAt }
const otpStore = new Map();

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
router.post("/auth/send-otp", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanEmail = email.toLowerCase();

    otpStore.set(cleanEmail, {
      otp,
      data: {
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone || "",
      },
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Attempt email dispatch
    try {
      await sendOTPEmail(cleanEmail, otp, name);
      return res.status(200).json({
        message: "OTP sent to your email. Check your inbox.",
      });
    } catch (emailErr) {
      console.error(
        "❌ Email dispatch failed inside send-otp route:",
        emailErr.message,
      );

      // If email fails on cloud server, return explicit 500 error to unfreeze frontend button
      return res.status(500).json({
        message:
          "Failed to send OTP email. Please verify backend EMAIL_USER and EMAIL_PASS environment variables.",
      });
    }
  } catch (err) {
    console.error("❌ Send OTP Error:", err);
    return res
      .status(500)
      .json({ message: "Server error while processing OTP request." });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email.toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record)
      return res
        .status(400)
        .json({
          message: "No OTP found for this email. Please register again.",
        });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res
        .status(400)
        .json({ message: "OTP expired. Please register again." });
    }
    if (record.otp !== otp.trim())
      return res
        .status(400)
        .json({ message: "Incorrect OTP. Please try again." });

    const { name, password, phone } = record.data;
    otpStore.delete(cleanEmail);

    const hashed = await bcrypt.hash(password, 12);
    const SUPER = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    const role = cleanEmail === SUPER ? "super_admin" : "customer";

    const user = await User.create({
      name,
      email: cleanEmail,
      password: hashed,
      phone,
      role,
    });
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Verify OTP Error:", err);
    return res
      .status(500)
      .json({ message: "Server error during verification" });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
router.post("/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record)
      return res
        .status(400)
        .json({ message: "No pending registration found. Please start over." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, {
      ...record,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    try {
      await sendOTPEmail(cleanEmail, otp, record.data.name);
      return res.status(200).json({ message: "New OTP sent to your email." });
    } catch (emailErr) {
      console.error("❌ Resend OTP Email Error:", emailErr.message);
      return res.status(500).json({ message: "Failed to resend OTP email." });
    }
  } catch (err) {
    console.error("❌ Resend OTP Error:", err);
    return res.status(500).json({ message: "Failed to resend OTP." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const cleanEmail = email.toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user)
      return res
        .status(401)
        .json({ message: "No account found with this email" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });

    // Auto-upgrade to super_admin if email matches env variable
    const SUPER = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    if (SUPER && user.email === SUPER && user.role !== "super_admin") {
      user.role = "super_admin";
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch("/auth/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email, avatarUrl } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name && name.trim() !== user.name) {
      if (user.nameChangedAt) {
        const daysSince =
          (Date.now() - new Date(user.nameChangedAt)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          const daysLeft = Math.ceil(7 - daysSince);
          return res
            .status(400)
            .json({
              message: `You can change your name again in ${daysLeft} day(s)`,
            });
        }
      }
      user.name = name.trim();
      user.nameChangedAt = new Date();
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing)
        return res
          .status(409)
          .json({ message: "This email is already in use by another account" });
      user.email = email.toLowerCase();
    }

    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error updating profile" });
  }
});

// ── DELETE /api/auth/account ──────────────────────────────────────────────────
router.delete("/auth/account", authMiddleware, async (req, res) => {
  try {
    const target = await User.findById(req.user.id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === "super_admin") {
      const subAdmin = await User.findOne({ role: "sub_admin" });
      if (subAdmin) {
        subAdmin.role = "super_admin";
        await subAdmin.save();
        console.log(`👑 Sub admin ${subAdmin.email} promoted to Super Admin.`);
      }
    }

    await User.findByIdAndDelete(req.user.id);
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error deleting account" });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/admin/users", superAdminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
router.patch(
  "/admin/users/:id/role",
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { role } = req.body;
      if (!["customer", "staff", "sub_admin"].includes(role))
        return res
          .status(400)
          .json({ message: "Role must be customer, staff or sub_admin" });

      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (target.role === "super_admin")
        return res
          .status(403)
          .json({ message: "Cannot change super admin role" });

      target.role = role;
      await target.save();
      return res
        .status(200)
        .json({ message: `Role updated to ${role}`, user: target });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  },
);

export default router;
