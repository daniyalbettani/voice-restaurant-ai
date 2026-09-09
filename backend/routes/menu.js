import { Router } from "express";
import multer from "multer";
import { Menu } from "../models/Menu.js";
import { uploadFromUrl, uploadBuffer } from "../utils/cloudinary.js";
import { superAdminMiddleware } from "../middlewares/auth.js";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET /api/menu ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    // Return all items if 'available' flag is undefined or true
    const items = await Menu.find({ available: { $ne: false } });
    res.json(items);
  } catch (err) {
    console.error("Fetch menu error:", err);
    res.status(500).json({ message: "Error fetching menu" });
  }
});

export default router;