import { Router } from "express";
import {
  assigningRoleByAdmin,
  getCurrentUser,
  gettingAdminUser,
  loginUser,
  logOut,
  profile,
  resendOtp,
  sendOtp,
  userAccountDeletion,
  verifyOtp,
} from "../controllers/auth.controller.js";
import {
  superAdminMiddleware,
  verifyJWT,
} from "../middlewares/auth.middleware.js";

export const authRouter = Router();

// PUBLIC ROUTES
authRouter.post("/send-otp", sendOtp);
authRouter.post("/verfiy-otp", verifyOtp);
authRouter.post("/login-user", loginUser);
authRouter.post("/resend-otp", resendOtp);

// Private Routes protected by verifyJWT middleware
authRouter.post("/log-out", verifyJWT, logOut);
authRouter.get("/me", verifyJWT, getCurrentUser);
authRouter.patch("/profile", verifyJWT, profile);
authRouter.delete("/account", verifyJWT, userAccountDeletion);
authRouter.get("/admin/users", superAdminMiddleware, gettingAdminUser);
authRouter.patch(
  "/admin/users/:id/role",
  superAdminMiddleware,
  assigningRoleByAdmin,
);
