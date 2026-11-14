import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 Create new order from active cart (Cart Checkout)
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, paymentMethod, customerNote } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.menuItem",
  );
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  const orderItems = cart.items.map((item) => ({
    menuItem: item.menuItem._id,
    name: item.menuItem.name,
    price: item.menuItem.price,
    quantity: item.quantity,
  }));

  const newOrder = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalAmount: cart.totalAmount,
    deliveryAddress: deliveryAddress || {},
    paymentMethod: paymentMethod || "COD",
    customerNote: customerNote || "",
    source: "CART",
  });

  // Empty cart after checkout
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  // ⚡ REAL-TIME: Kitchen Screen par instant alert bhejega
  const io = req.app.get("io");
  if (io) io.emit("newOrder", newOrder);

  return res
    .status(201)
    .json(new ApiResponse(201, newOrder, "Order placed successfully"));
});

/**
 Cancel order within 5 minutes if not locked by chef
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Search order with ownership check
  const order = await Order.findOne({ _id: id, user: req.user._id });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (["DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
    throw new ApiError(
      400,
      `Cannot cancel — order is already ${order.orderStatus}`,
    );
  }

  // 1. Chef Lock Check
  if (order.locked) {
    throw new ApiError(
      400,
      "Order cannot be cancelled. The chef has already locked and started cooking your order!",
    );
  }

  // 2. 5-Minute Time Window Check
  const timeDiffMs = Date.now() - new Date(order.createdAt).getTime();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  if (timeDiffMs > FIVE_MINUTES_MS) {
    throw new ApiError(
      400,
      "Cannot cancel — 5-minute cancellation window has expired!",
    );
  }

  order.orderStatus = "CANCELLED";
  await order.save();

  // ⚡ REAL-TIME: Notify Kitchen Dashboard of cancellation
  const io = req.app.get("io");
  if (io) io.emit("orderUpdated", order);

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

/**
  Lock order (Chef starts cooking - Admin/Kitchen staff only) 
 */
export const lockOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.orderStatus !== "PENDING") {
    throw new ApiError(400, "Only PENDING orders can be locked by chef.");
  }

  if (order.locked) {
    throw new ApiError(400, "Order is already locked.");
  }

  order.locked = true;
  order.orderStatus = "PREPARING";
  await order.save();

  const io = req.app.get("io");
  if (io) io.emit("orderUpdated", order);

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order locked. Chef started cooking."));
});

/**
 *   Get all system orders with optional status filter (Admin Only)
 *
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};

  if (status) {
    filter.orderStatus = status.toUpperCase();
  }

  const orders = await Order.find(filter)
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "All orders retrieved successfully"));
});

/**
 * Get kitchen & dashboard statistics (Admin Analytics)
 */
export const getOrderStats = asyncHandler(async (req, res) => {
  const [
    total,
    pending,
    preparing,
    ready,
    delivered,
    cancelled,
    revenueAgg,
    userCount,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: "PENDING" }),
    Order.countDocuments({ orderStatus: "PREPARING" }),
    Order.countDocuments({ orderStatus: "READY" }),
    Order.countDocuments({ orderStatus: "DELIVERED" }),
    Order.countDocuments({ orderStatus: "CANCELLED" }),
    Order.aggregate([
      { $match: { orderStatus: { $ne: "CANCELLED" } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]),
    User.countDocuments(),
  ]);

  const stats = {
    totalOrders: total,
    pending,
    preparing,
    ready,
    delivered,
    cancelled,
    totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    totalUsers: userCount,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Dashboard stats fetched successfully"));
});

/**
 Get user order history
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "User orders fetched successfully"));
});


/**
 * Update order status (Admin / Staff)
 * PATCH /api/orders/:id/status   body: { status }
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const VALID_STATUSES = ["PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"];
  if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
    throw new ApiError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found");

  order.orderStatus = status.toUpperCase();
  await order.save();

  const io = req.app.get("io");
  if (io) io.emit("orderUpdated", order);

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});

/**
 * Delete a single order (Admin / Super Admin)
 * DELETE /api/orders/:id
 */
export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByIdAndDelete(id);
  if (!order) throw new ApiError(404, "Order not found");

  const io = req.app.get("io");
  if (io) io.emit("orderDeleted", id);

  return res
    .status(200)
    .json(new ApiResponse(200, { _id: id }, "Order deleted successfully"));
});

/**
 * Bulk delete orders (Admin / Super Admin)
 * DELETE /api/orders/bulk   body: { ids: ["id1", "id2", ...] }
 */
export const bulkDeleteOrders = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, "ids must be a non-empty array");
  }

  await Order.deleteMany({ _id: { $in: ids } });

  const io = req.app.get("io");
  if (io) ids.forEach((id) => io.emit("orderDeleted", id));

  return res
    .status(200)
    .json(new ApiResponse(200, { deleted: ids.length }, `${ids.length} orders deleted`));
});

/**
 * Customer Final Confirm — locks own PENDING order so chef can start immediately.
 * This is customer-owned: ownership is verified, no admin role needed.
 * PATCH /api/orders/:id/confirm
 */
export const confirmOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({ _id: id, user: req.user._id });
  if (!order) throw new ApiError(404, "Order not found");

  if (order.locked) {
    throw new ApiError(400, "Order is already locked.");
  }

  if (order.orderStatus !== "PENDING") {
    throw new ApiError(400, "Only PENDING orders can be confirmed.");
  }

  order.locked = true;
  order.orderStatus = "PREPARING";
  await order.save();

  const io = req.app.get("io");
  if (io) io.emit("orderUpdated", order);

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order confirmed! Chef is starting now."));
});

/**
 * Reorder last meal — copies the most recent completed order items back into the cart.
 * POST /api/orders/reorder
 */
export const reorderLastMeal = asyncHandler(async (req, res) => {
  const { Menu } = await import("../models/Menu.js");

  // Find the most recent non-cancelled order for this user
  const lastOrder = await Order.findOne({
    user: req.user._id,
    orderStatus: { $ne: "CANCELLED" },
  }).sort({ createdAt: -1 });

  if (!lastOrder || lastOrder.items.length === 0) {
    throw new ApiError(404, "No previous order found to reorder.");
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // Add each item from last order into cart (merge quantities if already present)
  for (const orderedItem of lastOrder.items) {
    if (!orderedItem.menuItem) continue;

    // Check the item is still on the menu and available
    const menuItem = await Menu.findById(orderedItem.menuItem);
    if (!menuItem || menuItem.available === false) continue;

    const existingIdx = cart.items.findIndex(
      (ci) => ci.menuItem.toString() === orderedItem.menuItem.toString()
    );

    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += orderedItem.quantity;
    } else {
      cart.items.push({ menuItem: orderedItem.menuItem, quantity: orderedItem.quantity });
    }
  }

  // Recalculate total using live menu prices
  let total = 0;
  for (const item of cart.items) {
    const dish = await Menu.findById(item.menuItem);
    if (dish) total += Number(dish.price) * item.quantity;
  }
  cart.totalAmount = total;
  await cart.save();
  await cart.populate("items.menuItem");

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Last order added to your cart!"));
});
