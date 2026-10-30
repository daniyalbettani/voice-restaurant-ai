import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
// Verifies any logged-in user
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    //Getting the token from two possible places
    //Why both?
    // When the frontend is a website (React), tokens are often sent in cookies.
    // When the frontend is a mobile app or you use tools like Postman/Thunder Client, tokens are usually sent in the Authorization header.
    // So this code supports both ways.
    // ------
    //     req.header("Authorization")?.replace("Bearer ", "")
    // Reads the Authorization header
    // The header usually looks like this:
    // Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    // .replace("Bearer ", "") removes the word "Bearer " so we only keep the actual token
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Invalid Request!");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken",
    );
    if (!user) {
      throw new ApiError(401, "Invalid Access Token!");
    }

    //req object may user ko add kar do
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
