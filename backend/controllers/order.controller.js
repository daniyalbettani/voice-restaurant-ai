import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

let io;
export const setIo = (socketIo) => {
  io = socketIo;
};

export const order = asyncHandler(async (req, res) => {
  try {
    const order = await new Order(req.body).save();
    if (io) io.emit("newOrder", order);
    res.status(201).json({ message: "Order saved", order });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ message: "Error saving order" });
  }
});

export const orders = asyncHandler(async (req, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

export const getOrdersByUserId = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Error fetching order history" });
  }
});

export const cancelOrder = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (["done", "cancelled"].includes(order.status))
      return res
        .status(400)
        .json({ message: "Cannot cancel — order is already " + order.status });

    if (order.locked)
      return res.status(400).json({
        message:
          "❌ You already confirmed this order — it cannot be cancelled. The chef is cooking!",
      });

    const timeDiffMs = Date.now() - new Date(order.createdAt).getTime();
    if (timeDiffMs > 5 * 60 * 1000)
      return res.status(400).json({
        message: "Cannot cancel — 5-minute cancellation window has expired!",
      });

    order.status = "cancelled";
    await order.save();
    if (io) io.emit("orderUpdated", order);
    res.json({ message: "Order cancelled", order });
  } catch (err) {
    console.error("❌ Cancel error:", err);
    res.status(500).json({ message: "Error cancelling order: " + err.message });
  }
});

export const lockOrder = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending")
      return res
        .status(400)
        .json({ message: "Only pending orders can be locked." });
    if (order.locked)
      return res.status(400).json({ message: "Order is already locked." });

    order.locked = true;
    await order.save();
    if (io) io.emit("orderUpdated", order);
    res.json({ message: "Order locked. Chef can start cooking now!", order });
  } catch (err) {
    console.error("❌ Lock error:", err);
    res.status(500).json({ message: "Error locking order: " + err.message });
  }
});

export const orderStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "preparing", "ready", "done"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (io) io.emit("orderUpdated", order);
    res.json({ message: "Status updated", order });
  } catch {
    res.status(500).json({ message: "Error updating status" });
  }
});

export const deleteOrderBySuperAdmin = asyncHandler(async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "No IDs provided" });

    await Order.deleteMany({ _id: { $in: ids } });
    if (io) ids.forEach((id) => io.emit("orderDeleted", id));
    res.json({ message: `${ids.length} order(s) deleted` });
  } catch {
    res.status(500).json({ message: "Error deleting orders" });
  }
});

export const orderState = asyncHandler(async (req, res) => {
  try {
    const [total, pending, preparing, ready, done, rev, userCount] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: "pending" }),
        Order.countDocuments({ status: "preparing" }),
        Order.countDocuments({ status: "ready" }),
        Order.countDocuments({ status: "done" }),
        Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
        User.countDocuments(),
      ]);
    res.json({
      total,
      pending,
      preparing,
      ready,
      done,
      revenue: rev[0]?.total || 0,
      userCount,
    });
  } catch {
    res.status(500).json({ message: "Error fetching stats" });
  }
});
