import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { User } from "../models/User.model.js";
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
