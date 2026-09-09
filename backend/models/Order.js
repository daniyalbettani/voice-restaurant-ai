const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      quantity: Number,
      price: Number,
    },
  ],
  total: Number,
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "done"],
    default: "pending",
  },
  customerNote: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);