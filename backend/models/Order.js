import mongoose from "mongoose";

// Snapshot Schema for items inside an order

// In the Cart, we read prices from the Menu so they are always fresh.
// In the Order, we copy and freeze the prices so your receipt never changes.
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "Menu" },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ["PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: { type: String, default: "PENDING" },
    deliveryAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    customerNote: { type: String, default: "" },
    source: { type: String, enum: ["CART", "VOICE", "CHAT"], default: "CART" },
    locked: { type: Boolean, default: false }, // Chef lock status
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
