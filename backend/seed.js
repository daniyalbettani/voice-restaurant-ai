const mongoose = require("mongoose");
const Menu = require("./models/Menu");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const defaultMenu = [
    {
      name: "burger", price: 500, category: "fast-food", emoji: "🍔",
      description: "Juicy beef patty with fresh veggies & signature sauce",
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "pizza", price: 1200, category: "fast-food", emoji: "🍕",
      description: "Wood-fired with premium mozzarella & fresh toppings",
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "fries", price: 200, category: "fast-food", emoji: "🍟",
      description: "Crispy golden french fries, lightly salted",
      imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "biryani", price: 300, category: "main-course", emoji: "🍛",
      description: "Aromatic basmati rice with tender chicken & spices",
      imageUrl: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "pasta", price: 450, category: "main-course", emoji: "🍝",
      description: "Al dente pasta in rich tomato & herb sauce",
      imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "chicken", price: 600, category: "main-course", emoji: "🍗",
      description: "Tender grilled chicken breast with herbs & lemon",
      imageUrl: "https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "coke", price: 100, category: "drinks", emoji: "🥤",
      description: "Ice cold Coca-Cola, perfectly chilled",
      imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "mango shake", price: 180, category: "drinks", emoji: "🥭",
      description: "Fresh mango blended into a creamy milkshake",
      imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=250&fit=crop&auto=format",
    },
    {
      name: "water", price: 50, category: "drinks", emoji: "💧",
      description: "Chilled mineral water",
      imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=250&fit=crop&auto=format",
    },
  ];
  await Menu.deleteMany({});
  await Menu.insertMany(defaultMenu);
  console.log(`✅ Database seeded with ${defaultMenu.length} items (with real images)!`);
  process.exit(0);
}).catch((err) => {
  console.error("Error connecting to MongoDB:", err);
  process.exit(1);
});
