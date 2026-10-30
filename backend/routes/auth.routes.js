import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logOut,
  sendOtp,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const authRouter = Router();

// PUBLIC ROUTES
authRouter.post("/send-otp", sendOtp);
authRouter.post("/verfiy-otp", verifyOtp);
authRouter.post("/login-user", loginUser);

// Private Routes protected by verifyJWT middleware
authRouter.post("/log-out", verifyJWT, logOut);
authRouter.get("/me", verifyJWT, getCurrentUser);

export default authRouter;
