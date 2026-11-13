import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// Verifies any logged-in user (reads token from cookie OR Authorization header)
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // cookie name is "token" (set by loginUser/verifyOtp with .cookie("token", ...))
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Invalid Request!");
    }

    const decodedToken = jwt.verify(token, JWT_SECRET);

    // JWT payload uses "id" (set in generateAccessToken as { id: this._id })
    const user = await User.findById(decodedToken?.id).select(
      "-password -refreshToken",
    );
    if (!user) {
      throw new ApiError(401, "Invalid Access Token!");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Token");
  }
});

// Verifies staff, sub_admin, or super_admin
export const staffMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!["staff", "sub_admin", "super_admin"].includes(decoded.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. Staff/Admin only." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Verifies super_admin only
export const superAdminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "super_admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Add Admin Access Middleware (Role Check)
// To ensure regular customers cannot update order statuses, create or check src/middlewares/auth.middleware.js for an admin check
export const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    throw new ApiError(403, "Access denied. Admin resources only.");
  }
};

export const authorizedRoles = (...allowedRoles) => {
  return (req, _, next) => {
    // 1. Verify that verifyJWT ran first and attached req.user
    if (!req.user) {
      throw new ApiError(401, "Authentication required before authorization.");
    }

    // 2. Check if user's role is in the list of allowed roles, allowed roles = admin, agar user ka role admin hai toh usay access mil jayega if not then the access is denied
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
      );
    }

    // 3. User is authorized, pass control to next middleware/controller
    next();
  };
};
