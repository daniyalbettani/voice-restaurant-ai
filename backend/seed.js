import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import { Menu } from "./models/Menu.js";

// Force Google & Cloudflare DNS — fixes querySrv ECONNREFUSED on local ISPs
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const defaultMenu = [
  {
    name: "burger",
    price: 500,
    category: "fast-food",
    emoji: "🍔",
    description: "Juicy beef patty with fresh veggies & signature sauce",
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "pizza",
    price: 1200,
    category: "fast-food",
    emoji: "🍕",
    description: "Wood-fired with premium mozzarella & fresh toppings",
    imageUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "fries",
    price: 200,
    category: "fast-food",
    emoji: "🍟",
    description: "Crispy golden french fries, lightly salted",
    imageUrl:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "biryani",
    price: 300,
    category: "main-course",
    emoji: "🍛",
    description: "Aromatic basmati rice with tender chicken & spices",
    imageUrl:
      "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "pasta",
    price: 450,
    category: "main-course",
    emoji: "🍝",
    description: "Al dente pasta in rich tomato & herb sauce",
    imageUrl:
      "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "chicken",
    price: 600,
    category: "main-course",
    emoji: "🍗",
    description: "Tender grilled chicken breast with herbs & lemon",
    imageUrl:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "coke",
    price: 100,
    category: "drinks",
    emoji: "🥤",
    description: "Ice cold Coca-Cola, perfectly chilled",
    imageUrl:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "mango shake",
    price: 180,
    category: "drinks",
    emoji: "🥭",
    description: "Fresh mango blended into a creamy milkshake",
    imageUrl:
      "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=250&fit=crop&auto=format",
  },
  {
    name: "water",
    price: 50,
    category: "drinks",
    emoji: "💧",
    description: "Chilled mineral water",
    imageUrl:
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=250&fit=crop&auto=format",
  },
];

async function runSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database connected successfully");

    await Menu.deleteMany({});
    await Menu.insertMany(defaultMenu);
    console.log(`✅ Database seeded with ${defaultMenu.length} items!`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
}

runSeed();