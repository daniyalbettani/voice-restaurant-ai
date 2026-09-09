import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "voicebite_secret_2024";

// Verifies any logged-in user
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Verifies staff, sub_admin, or super_admin
export const staffMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!["staff", "sub_admin", "super_admin"].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied. Staff/Admin only." });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Verifies super_admin only
export const superAdminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied. Super admin only." });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};