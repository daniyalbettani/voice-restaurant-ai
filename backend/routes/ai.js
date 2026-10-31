import { Router } from "express";
import { voiceParser } from "../controllers/ai.controller.js";

export const voiceParseRouter = Router();

// ── POST /api/voice-parse ─────────────────────────────────────────────────────
voiceParseRouter.post("/voice-parse", voiceParser);
