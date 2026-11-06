import { Menu } from "../models/Menu.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadBuffer } from "../utils/cloudinary.js";

/**
 * @desc    Fetch all available menu items
 * @route   GET /api/menu
 * @access  Public
 */
export const getMenu = asyncHandler(async (req, res) => {
  // Query items where available is not false ($ne: false includes undefined/true)
  const items = await Menu.find({ available: { $ne: false } });

  return res
    .status(200)
    .json(new ApiResponse(200, items, "Menu items fetched successfully"));
});

/**
 * @desc    Create a new menu item with Cloudinary image upload
 * @route   POST /api/menu
 * @access  Private / Admin
 */
export const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, price, category } = req.body;

  if (!name || !price) {
    throw new ApiError(400, "Item name and price are required");
  }

  // 1. Verify Multer intercepted the file and loaded buffer to RAM
  if (!req.file || !req.file.buffer) {
    throw new ApiError(400, "Menu item image file is required");
  }

  // 2. Generate a unique publicId for Cloudinary
  const customPublicId = `item_${Date.now()}`;

  // 3. Upload RAM Buffer directly to Cloudinary
  const imageUrl = await uploadBuffer(req.file.buffer, customPublicId);

  if (!imageUrl) {
    throw new ApiError(500, "Failed to upload image to Cloudinary");
  }

  // 4. Save document into MongoDB with CDN URL
  const menuItem = await Menu.create({
    name,
    description,
    price,
    category,
    imageUrl,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, menuItem, "Menu item created successfully"));
});

/**
 * @desc    Delete a menu item by ID
 * @route   DELETE /api/menu/:id
 * @access  Private / Admin
 */
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Menu.findByIdAndDelete(id);

  if (!item) {
    throw new ApiError(404, "Menu item not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Menu item deleted successfully"));
});