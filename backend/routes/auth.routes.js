import { Router } from "express";
import {
  getAdminUsers,
  getCurrentUser,
  loginUser,
  logOut,
  resendOtp,
  sendOtp,
  updateProfile,
  deleteAccount,
  verifyOtp,
  updateUserRole,
} from "../controllers/auth.controller.js";
import {
  superAdminMiddleware,
  verifyJWT,
} from "../middlewares/auth.middleware.js";

export const authRouter = Router();

// PUBLIC ROUTES
authRouter.post("/send-otp", sendOtp);
authRouter.post("/verify-otp", verifyOtp); // fixed typo: was /verfiy-otp
authRouter.post("/login", loginUser); // matches frontend /api/auth/login
authRouter.post("/login-user", loginUser); // kept for backwards compat
authRouter.post("/resend-otp", resendOtp);

// Private Routes protected by verifyJWT middleware
authRouter.post("/log-out", verifyJWT, logOut);
authRouter.get("/me", verifyJWT, getCurrentUser);
authRouter.patch("/profile", verifyJWT, updateProfile);
authRouter.delete("/account", verifyJWT, deleteAccount);
authRouter.get("/admin/users", superAdminMiddleware, getAdminUsers);
authRouter.patch("/admin/users/:id/role", superAdminMiddleware, updateUserRole);
