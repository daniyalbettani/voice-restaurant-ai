const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  price:       { type: Number, required: true },
  category:    { type: String, default: "general", enum: ["fast-food","main-course","drinks","desserts","general"] },
  description: { type: String, default: "" },
  emoji:       { type: String, default: "🍽️" },
  imageUrl:    { type: String, default: "" },
  available:   { type: Boolean, default: true },
});

module.exports = mongoose.model("Menu", menuSchema);
