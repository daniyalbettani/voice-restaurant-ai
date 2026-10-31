import { Router } from "express";
import {
  cancelOrder,
  createOrder,
  getAllOrders,
  deleteOrderBySuperAdmin,
  getOrdersByUserId,
  lockOrder,
  getOrderStats,
  updateOrderStatus
} from "../controllers/order.controller.js";
import {
  staffMiddleware,
  superAdminMiddleware,
} from "../middlewares/auth.middleware.js";

export const OrderRouter = Router();

// ── POST /api/order OR /api/orders ──────────────────────────────────────────
// Supports both singular and plural endpoints to prevent 404 errors from the frontend
OrderRouter.post(["/order", "/orders"], createOrder);

// ── GET /api/orders (Staff/Admin Protected) ──────────────────────────────────
OrderRouter.get("/orders", getAllOrders);

// ── GET /api/orders/user/:userId ──────────────────────────────────────────────
OrderRouter.get("/orders/user/:userId", getOrdersByUserId);

// ── PATCH /api/orders/:id/cancel ──────────────────────────────────────────────
OrderRouter.patch("/orders/:id/cancel", cancelOrder);

// ── PATCH /api/orders/:id/lock ────────────────────────────────────────────────
OrderRouter.patch("/orders/:id/lock", lockOrder);

// ── PATCH /api/orders/:id/status ──────────────────────────────────────────────
OrderRouter.patch("/orders/:id/status", getOrderStats);

// ── DELETE /api/orders (Bulk Super Admin Only) ────────────────────────────────
OrderRouter.delete("/orders", superAdminMiddleware, deleteOrderBySuperAdmin);

// ── GET /api/stats (Staff/Admin Protected) ───────────────────────────────────
OrderRouter.get("/stats", staffMiddleware, updateOrderStatus);
