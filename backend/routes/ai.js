import { Router } from "express";
import { processVoiceCommand } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

export const aiRouter = Router();

// Tamam AI voice routes ko JWT authentication se protect karein
aiRouter.use(verifyJWT);

// Voice command processing endpoint
aiRouter.post("/process-voice", processVoiceCommand);
