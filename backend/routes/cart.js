import { Router } from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartItemQty,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

export const cartRouter = Router();

// All cart routes require a valid JWT
cartRouter.use(verifyJWT);

cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.patch("/update/:menuItemId", updateCartItemQty); // PATCH /api/cart/update/:id
cartRouter.delete("/clear", clearCart); // DELETE /api/cart/clear
cartRouter.delete("/remove/:menuItemId", removeFromCart);
