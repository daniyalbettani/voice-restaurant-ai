import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// ─── verifyJWT ────────────────────────────────────────────────────────────────
// Reads token from cookie OR Authorization: Bearer header.
// Sets req.user to the full Mongoose User document.
// All controllers must use req.user._id (Mongoose doc), not req.user.id.
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
      throw new ApiError(401, "Authentication required. Please log in.");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        throw new ApiError(401, "Session expired. Please log in again.");
      }
      throw new ApiError(401, "Invalid token. Please log in again.");
    }

    // JWT payload uses field "id" (set in generateAccessToken as { id: this._id })
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      throw new ApiError(401, "User account not found. Please log in again.");
    }

    req.user = user; // full Mongoose doc — has ._id, .role, .name, .email
    next();
  } catch (error) {
    // Re-throw ApiErrors as-is; wrap anything else
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, error?.message || "Authentication failed.");
  }
});

// ─── staffMiddleware ──────────────────────────────────────────────────────────
// Verifies staff, sub_admin, or super_admin via Authorization header.
// Sets req.user to full Mongoose doc (consistent with verifyJWT).
export const staffMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!["staff", "sub_admin", "super_admin"].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied. Staff/Admin only." });
    }
    // Load full user doc so req.user._id works in controllers
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found." });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
});

// ─── superAdminMiddleware ─────────────────────────────────────────────────────
export const superAdminMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied. Super admin only." });
    }
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found." });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
});

// ─── verifyAdmin ──────────────────────────────────────────────────────────────
// Runs AFTER verifyJWT. Checks role on req.user (Mongoose doc).
export const verifyAdmin = (req, res, next) => {
  const ADMIN_ROLES = ["staff", "sub_admin", "super_admin"];
  if (req.user && ADMIN_ROLES.includes(req.user.role)) {
    return next();
  }
  throw new ApiError(403, "Access denied. Staff or Admin only.");
};

// ─── authorizedRoles ──────────────────────────────────────────────────────────
// Generic role-guard. Must run after verifyJWT.
export const authorizedRoles = (...allowedRoles) => {
  return (req, _, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required before authorization.");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Role '${req.user.role}' is not authorized.`,
      );
    }
    next();
  };
};
