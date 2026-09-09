import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  items: [{ name: String, quantity: Number, price: Number }],
  total: Number,
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "done", "cancelled"],
    default: "pending",
  },
  customerNote: { type: String, default: "" },
  source: { type: String, enum: ["cart", "voice", "chat"], default: "cart" },
  // locked: true = customer clicked "Final Confirm" — no cancellation allowed, chef starts immediately
  locked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Order = mongoose.model("Order", orderSchema);
