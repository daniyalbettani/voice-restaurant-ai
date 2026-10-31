import multer from "multer";
import { Menu } from "../models/Menu.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

export const getMenu = asyncHandler(async (req, res) => {
  try {
    // Return all items if 'available' flag is undefined or true
    const items = await Menu.find({ available: { $ne: false } });
    res.json(items);
  } catch (err) {
    console.error("Fetch menu error:", err);
    res.status(500).json({ message: "Error fetching menu" });
  }
});
