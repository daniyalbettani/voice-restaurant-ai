import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  lockOrder,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  deleteOrder,
  bulkDeleteOrders,
} from "../controllers/order.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

export const orderRouter = Router();

// All order endpoints require a logged-in user (JWT)
orderRouter.use(verifyJWT);

// =========================================================================
// CUSTOMER ROUTES
// =========================================================================
orderRouter.post("/", createOrder);             // Place order from active cart
orderRouter.get("/my-orders", getMyOrders);     // User's own order history
orderRouter.patch("/:id/cancel", cancelOrder);  // Cancel within 5-minute window

// =========================================================================
// ADMIN & KITCHEN STAFF ROUTES
// =========================================================================
orderRouter.get("/admin/all", verifyAdmin, getAllOrders);        // All orders (?status=PENDING)
orderRouter.get("/admin/stats", verifyAdmin, getOrderStats);     // Kitchen & revenue analytics
orderRouter.patch("/:id/lock", verifyAdmin, lockOrder);          // Chef lock (PENDING → PREPARING)
orderRouter.patch("/:id/status", verifyAdmin, updateOrderStatus); // Manual status override
orderRouter.delete("/bulk", verifyAdmin, bulkDeleteOrders);       // Bulk delete { ids: [...] }
orderRouter.delete("/:id", verifyAdmin, deleteOrder);            // Delete single order
