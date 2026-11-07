import { Cart } from "../models/Cart.js";
import { Menu } from "../models/Menu.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// the helper function which Recalculates total cart price using live prices from Menu collection
const recalculateCartTotal = async (cart) => {
  let total = 0;
  for (const item of cart.items) {
    const dish = await Menu.findById(item.menuItem);
    if (dish) {
      total += dish.price * item.quantity;
    }
  }
  return total;
};
//.populate() empty ID no. uthata hai DB se  aur phir usay fill karta hai mukamal detailed document may kissi aur database collection se

// When you pass the string "items.menuItem" to .populate(), you are telling Mongoose:
// "Go inside the items array, look at the menuItem property on every object inside that array, take the ID stored there, go to the Menu collection, and fill in the full dish details."
// cartSchema (Main Document)
//   └── items (Array)
//         └── cartItemSchema (Objects inside the array)
//               └── menuItem (Field containing the ObjectId + ref: "Menu")
export const getCart = asyncHandler(async (req, res) => {
  // Find cart for logged-in user and swap menuItem ObjectIds with actual Menu documents
  let cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.menuItem",
  );

  if (!cart) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { items: [], totalAmount: 0 }, "Cart is empty"),
      );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart retrieved successfully"));
});

//1) addToCart Function => Existence Check: Does the dish ID sent by the client actually exist in our Menu database collection?

// Fetch or Initialize Cart: Does this user already have a cart document, or is this their very first item?

// Array Mutation: Is the dish already sitting inside their items array?

// If YES: Increase its quantity number.

// If NO: Push a new { menuItem, quantity } object into the array.

// Recalculation: Update totalAmount based on live prices and save to MongoDB.

export const addToCart = asyncHandler(async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;

  // 1. Validation: Ensure client sent an ID
  if (!menuItemId) {
    throw new ApiError(400, "Menu Item ID is required");
  }

  // 2. Verify dish exists in Menu collection
  const dish = await Menu.findById(menuItemId);
  if (!dish) {
    throw new ApiError(404, "Menu item not found");
  }

  // 3. Find existing cart for user, or instantiate a new one
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // 4. Check if dish already exists inside cart.items array
  const existingItemIndex = cart.items.findIndex(
    (item) => item.menuItem.toString() === menuItemId,
  );

  if (existingItemIndex > -1) {
    // Item exists -> Increase quantity
    cart.items[existingItemIndex].quantity += Number(quantity);
  } else {
    // New item -> Push object to array
    cart.items.push({ menuItem: menuItemId, quantity: Number(quantity) });
  }

  // 4. Recalculate total amount and save to DB
  cart.totalAmount = await recalculateCartTotal(cart);
  await cart.save();

  // Populate menu details before returning HTTP response
  await cart.populate("items.menuItem");

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item added to cart successfully"));
});

// The removeFromCart function handles removing a specific dish from a user's cart array, updating the total price, and saving the updated cart state to MongoDB.
export const removeFromCart = asyncHandler(async (req, res) => {
  const { menuItemId } = req.params;

  // 1. Find cart for the logged-in user
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  /// 2. Keep every item EXCEPT the one matching menuItemId
  cart.items = cart.items.filter(
    (item) => item.menuItem.toString() !== menuItemId,
  );

  // Recalculate total amount and save
  cart.totalAmount = await recalculateCartTotal(cart);
  await cart.save();

  await cart.populate("items.menuItem");

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item removed from cart successfully"));
});
