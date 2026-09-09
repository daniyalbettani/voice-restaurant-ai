/**
 * One-time fix script: uploads biryani & chicken images to Cloudinary
 * and patches those two MongoDB documents directly.
 *
 * Run: node scripts/fixImages.js
 */
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Menu } from "../models/Menu.js";

// Force Google DNS — required on some ISPs that can't resolve MongoDB Atlas SRV
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const FIXES = [
  {
    name:   "biryani",
    // Popular Pakistani/Indian chicken biryani — reliably public on Unsplash
    source: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&q=80",
  },
  {
    name:   "chicken",
    // Grilled chicken dish — reliably public on Unsplash
    source: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80",
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  for (const fix of FIXES) {
    console.log(`\n☁️  Uploading ${fix.name} to Cloudinary…`);
    try {
      const result = await cloudinary.uploader.upload(fix.source, {
        public_id:      fix.name,
        folder:         "voicebite/menu",
        overwrite:      true,
        resource_type:  "image",
        transformation: [{ width: 800, height: 800, crop: "fill", gravity: "center", quality: "auto:good", fetch_format: "auto" }],
      });
      console.log(`✅ Uploaded: ${result.secure_url}`);

      await Menu.findOneAndUpdate(
        { name: fix.name },
        { imageUrl: result.secure_url }
      );
      console.log(`✅ MongoDB updated for "${fix.name}"`);
    } catch (err) {
      console.error(`❌ Failed for ${fix.name}:`, err.message);
    }
  }

  console.log("\n🎉 Done! Biryani & chicken images fixed.");
  await mongoose.disconnect();
  process.exit(0);
}

run();
