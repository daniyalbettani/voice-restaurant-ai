import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  lockOrder,
  getAllOrders,
  getOrderStats,
} from "../controllers/order.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

export const orderRouter = Router();

// Sabhi order endpoints ke liye user ka login (JWT) hona zaroori hai
orderRouter.use(verifyJWT);

// =========================================================================
// CUSTOMER ROUTES
// =========================================================================
orderRouter.post("/", createOrder); // Cart se naya order place karna
orderRouter.get("/my-orders", getMyOrders); // Apni order history dekhna
orderRouter.patch("/:id/cancel", cancelOrder); // 5-minute window ke andar order cancel karna

// =========================================================================
// ADMIN & KITCHEN STAFF ROUTES
// =========================================================================
orderRouter.get("/admin/all", verifyAdmin, getAllOrders); // Tamam orders dekhna (?status=PENDING)
orderRouter.get("/admin/stats", verifyAdmin, getOrderStats); // Kitchen & revenue analytics
orderRouter.patch("/:id/lock", verifyAdmin, lockOrder); // Chef lock (order status -> PREPARING)
