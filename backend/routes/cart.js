import { Router } from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

export const cartRouter = Router();

// Protect ALL cart routes with JWT verification
cartRouter.use(verifyJWT);

cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.delete("/remove/:menuItemId", removeFromCart);

// cartRouter.get("/", verifyJWT, getCart);
// cartRouter.post("/add", verifyJWT, addToCart);
// cartRouter.post("/remove/:menuItemId", verifyJWT, removeFromCart);
