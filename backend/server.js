const Order = require("./models/Order");
const Menu = require("./models/Menu");
const User = require("./models/User");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*", methods: ["GET","POST","PATCH","DELETE"] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || "voicebite_secret_2024";

// ─── OTP STORE (in-memory, expires in 10 min) ────────────────────────────────
const otpStore = new Map(); // email -> { otp, data, expiresAt }

// ─── EMAIL TRANSPORTER ───────────────────────────────────────────────────────
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (emailUser && emailUser !== "your_gmail@gmail.com" && emailPass && emailPass !== "your_gmail_app_password") {
    return nodemailer.createTransport({ service: "gmail", auth: { user: emailUser, pass: emailPass } });
  }
  return null; // Will use Ethereal test account
};

const sendOTPEmail = async (toEmail, otp, name) => {
  const emailHtml = `
    <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#fff;padding:40px;border-radius:16px;">
      <h1 style="color:#f97316;font-size:28px;margin-bottom:8px;">🍽️ VoiceBite AI</h1>
      <p style="color:#a1a1aa;margin-bottom:32px;">Email Verification</p>
      <h2 style="font-size:18px;margin-bottom:16px;">Hello ${name}! 👋</h2>
      <p style="color:#a1a1aa;margin-bottom:24px;">Use this OTP to verify your email. It expires in <strong style="color:#fff;">10 minutes</strong>.</p>
      <div style="background:#1a1a2e;border:2px solid #f97316;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#f97316;">${otp}</div>
      </div>
      <p style="color:#52525b;font-size:13px;">If you didn't request this, ignore this email.</p>
      <p style="color:#52525b;font-size:13px;margin-top:24px;">🔒 VoiceBite AI — Secure & Encrypted</p>
    </div>
  `;

  const realTransporter = createTransporter();

  if (realTransporter) {
    // Use real Gmail
    await realTransporter.sendMail({
      from: `"VoiceBite AI 🍽️" <${process.env.EMAIL_USER}>`,
      to: toEmail, subject: "Your VoiceBite OTP Code", html: emailHtml,
    });
    console.log(`✅ OTP email sent to ${toEmail}`);
  } else {
    // Use Ethereal test email (no config needed — shows preview URL)
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email", port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const info = await testTransporter.sendMail({
      from: '"VoiceBite AI 🍽️" <noreply@voicebite.ai>',
      to: toEmail, subject: "Your VoiceBite OTP Code", html: emailHtml,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n📧 OTP EMAIL PREVIEW (click to view in browser):`);
    console.log(`👉 ${previewUrl}`);
    console.log(`📌 OTP for ${toEmail}: ${otp}\n`);
  }
  return true;
};

// ─── DB CONNECTION ────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected 🚀"))
  .catch((err) => console.log("MongoDB Error:", err));

app.get("/", (req, res) => res.send("VoiceBite AI Backend 🚀"));

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: "Invalid or expired token" }); }
};

const staffMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'staff' && decoded.role !== 'super_admin')
      return res.status(403).json({ message: "Access denied. Staff only." });
    req.user = decoded; next();
  } catch { res.status(401).json({ message: "Invalid token" }); }
};

const superAdminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'super_admin')
      return res.status(403).json({ message: "Access denied. Super admin only." });
    req.user = decoded; next();
  } catch { res.status(401).json({ message: "Invalid token" }); }
};

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

// Step 1: Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "An account with this email already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, data: { name, email, password, phone }, expiresAt: Date.now() + 10 * 60 * 1000 });

    await sendOTPEmail(email, otp, name);
    res.json({ message: "OTP sent to your email. Check your inbox (or server console if email not configured)." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP. Try again." });
  }
});

// Step 2: Verify OTP & create account
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ message: "No OTP found for this email. Please register again." });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired. Please register again." });
    }
    if (record.otp !== otp.trim())
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });

    const { name, password, phone } = record.data;
    otpStore.delete(email);

    const hashed = await bcrypt.hash(password, 12);
    const SUPER = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    const role  = (email.toLowerCase() === SUPER) ? 'super_admin' : 'customer';
    const user  = await User.create({ name, email, password: hashed, phone: phone || "", role });
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during verification" });
  }
});

// Resend OTP
app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ message: "No pending registration found. Please start over." });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { ...record, otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOTPEmail(email, otp, record.data.name);
    res.json({ message: "New OTP sent to your email." });
  } catch {
    res.status(500).json({ message: "Failed to resend OTP." });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "No account found with this email" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });
    // Auto-upgrade to super_admin if email matches
    const SUPER = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    if (SUPER && user.email === SUPER && user.role !== 'super_admin') {
      user.role = 'super_admin'; await user.save();
    }
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "Login successful", token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role } });
  } catch { res.status(500).json({ message: "Server error during login" }); }
});

// ─── USER MANAGEMENT (super_admin only) ──────────────────────────────────────
// List all users
app.get("/api/admin/users", superAdminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch { res.status(500).json({ message: "Server error" }); }
});

// Update a user's role (grant/revoke staff)
app.patch("/api/admin/users/:id/role", superAdminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer','staff'].includes(role))
      return res.status(400).json({ message: "Role must be 'customer' or 'staff'" });
    // Cannot demote the super_admin
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === 'super_admin')
      return res.status(403).json({ message: "Cannot change super admin role" });
    target.role = role;
    await target.save();
    res.json({ message: `Role updated to ${role}`, user: target });
  } catch { res.status(500).json({ message: "Server error" }); }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch { res.status(500).json({ message: "Server error" }); }
});

// Update profile (name weekly lock, email, avatar)
app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email, avatarUrl } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name && name.trim() !== user.name) {
      if (user.nameChangedAt) {
        const daysSince = (Date.now() - new Date(user.nameChangedAt)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          const daysLeft = Math.ceil(7 - daysSince);
          return res.status(400).json({ message: `You can change your name again in ${daysLeft} day(s)` });
        }
      }
      user.name = name.trim();
      user.nameChangedAt = new Date();
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ message: "This email is already in use by another account" });
      user.email = email.toLowerCase();
    }

    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    const updated = { id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, nameChangedAt: user.nameChangedAt };
    res.json({ message: "Profile updated successfully", token, user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating profile" });
  }
});

// Delete account
app.delete("/api/auth/account", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted successfully" });
  } catch { res.status(500).json({ message: "Server error deleting account" }); }
});

// ─── SOCKET ───────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Disconnected:", socket.id));
});

// ─── MENU ROUTES ─────────────────────────────────────────────────────────────
app.get("/api/menu", async (req, res) => {
  try { res.json(await Menu.find({ available: true })); }
  catch { res.status(500).json({ message: "Error fetching menu" }); }
});

app.post("/api/menu/seed", async (req, res) => {
  try {
    const items = [
      { name:"burger",      price:500,  category:"fast-food",   emoji:"🍔", description:"Juicy beef patty with fresh veggies & sauce" },
      { name:"pizza",       price:1200, category:"fast-food",   emoji:"🍕", description:"Wood-fired with premium mozzarella & toppings" },
      { name:"fries",       price:200,  category:"fast-food",   emoji:"🍟", description:"Crispy golden french fries, lightly salted" },
      { name:"biryani",     price:300,  category:"main-course", emoji:"🍛", description:"Aromatic basmati rice with tender chicken & spices" },
      { name:"pasta",       price:450,  category:"main-course", emoji:"🍝", description:"Al dente pasta in rich tomato & herb sauce" },
      { name:"chicken",     price:600,  category:"main-course", emoji:"🍗", description:"Tender grilled chicken breast with herbs" },
      { name:"coke",        price:100,  category:"drinks",      emoji:"🥤", description:"Ice cold Coca-Cola, perfectly chilled" },
      { name:"mango shake", price:180,  category:"drinks",      emoji:"🥭", description:"Fresh mango blended into a creamy milkshake" },
      { name:"water",       price:50,   category:"drinks",      emoji:"💧", description:"Chilled mineral water" },
    ];
    await Menu.deleteMany({});
    await Menu.insertMany(items);
    res.json({ message: "Menu seeded", count: items.length });
  } catch { res.status(500).json({ message: "Error seeding menu" }); }
});

// ─── ORDER ROUTES ─────────────────────────────────────────────────────────────
app.post("/api/order", async (req, res) => {
  try {
    const order = await new Order(req.body).save();
    io.emit("newOrder", order);
    res.status(201).json({ message: "Order saved", order });
  } catch { res.status(500).json({ message: "Error saving order" }); }
});

app.get("/api/orders", async (req, res) => {
  try { res.json(await Order.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ message: "Error fetching orders" }); }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending","preparing","ready","done"].includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    io.emit("orderUpdated", order);
    res.json({ message: "Status updated", order });
  } catch { res.status(500).json({ message: "Error updating status" }); }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    io.emit("orderDeleted", req.params.id);
    res.json({ message: "Order deleted" });
  } catch { res.status(500).json({ message: "Error deleting order" }); }
});

// Bulk delete (array of IDs)
app.delete("/api/orders", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "No IDs provided" });
    await Order.deleteMany({ _id: { $in: ids } });
    ids.forEach(id => io.emit("orderDeleted", id));
    res.json({ message: `${ids.length} order(s) deleted` });
  } catch { res.status(500).json({ message: "Error deleting orders" }); }
});

app.get("/api/stats", async (req, res) => {
  try {
    const [total, pending, preparing, ready, done, rev, userCount] = await Promise.all([
      Order.countDocuments(), Order.countDocuments({status:"pending"}),
      Order.countDocuments({status:"preparing"}), Order.countDocuments({status:"ready"}),
      Order.countDocuments({status:"done"}),
      Order.aggregate([{$group:{_id:null,total:{$sum:"$total"}}}]),
      User.countDocuments(),
    ]);
    res.json({ total, pending, preparing, ready, done, revenue: rev[0]?.total||0, userCount });
  } catch { res.status(500).json({ message: "Error fetching stats" }); }
});

// ─── AI VOICE ORDER PARSER (Groq primary → Gemini fallback) ──────────────────
app.post("/api/voice-parse", async (req, res) => {
  const { transcript, menu = [] } = req.body;
  if (!transcript) return res.status(400).json({ error: "No transcript" });

  const GROQ_KEY   = process.env.GROQ_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const menuStr    = menu.map(m => `${m.name} - Rs ${m.price}`).join(', ');

  const systemPrompt = `You are a smart multilingual food ordering AI for VoiceBite restaurant.
Menu items available: ${menuStr}

Rules:
- Understand ANY language: Urdu script (پیزا برگر), Roman Urdu (mujhe do pizza chahiye), Hindi, Hinglish, English
- If customer orders food → extract exact item names from the menu and quantities
- If greeting (hello/salam/assalamualaikum/hi/namaste) → greet warmly
- If asking about menu (kya hai / what do you have / menu dikhao) → list items with prices
- If not food related → politely redirect to food ordering
- ALWAYS respond in friendly natural English
- Urdu numbers: ek=1, do=2, teen=3, char=4, paanch=5; پیزا=pizza, برگر=burger, بریانی=biryani

Respond ONLY with valid JSON, no extra text:
{"intent":"order|greeting|menu_query|non_food|unclear","items":[{"name":"exact menu name","quantity":1}],"message":"friendly response"}`;

  const matchItems = (parsed, menu) => {
    const order = []; let total = 0;
    for (const item of (parsed.items || [])) {
      const n = item.name.toLowerCase();
      const found = menu.find(m =>
        m.name.toLowerCase() === n ||
        m.name.toLowerCase().includes(n) ||
        n.includes(m.name.toLowerCase())
      );
      if (found) {
        const qty = Math.max(1, parseInt(item.quantity) || 1);
        order.push({ name: found.name, quantity: qty, price: found.price });
        total += found.price * qty;
      }
    }
    return { order, total };
  };

  // ── Try Groq (Llama 3.3 70B) ───────────────────────────────────────────────
  if (GROQ_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: `Customer said: "${transcript}"` },
          ],
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        }),
      });
      const groqData = await groqRes.json();

      if (groqRes.ok) {
        const text  = groqData.choices?.[0]?.message?.content?.trim() || '';
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = null; }
        if (parsed && parsed.intent) {
          const { order, total } = matchItems(parsed, menu);
          console.log(`✅ Groq parsed: "${transcript}" → ${parsed.intent}`);
          return res.json({ intent: parsed.intent, items: order, total, message: parsed.message });
        }
      } else {
        console.warn('Groq error:', groqData?.error?.message);
      }
    } catch (err) { console.warn('Groq unavailable:', err.message); }
  }

  // ── Fallback: Gemini ───────────────────────────────────────────────────────
  if (GEMINI_KEY && !GEMINI_KEY.includes('Demo')) {
    try {
      const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
      const gmRes  = await fetch(gemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + '\n\nCustomer said: "' + transcript + '"' }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
        }),
      });
      const gmData = await gmRes.json();
      if (gmRes.ok) {
        const raw   = gmData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        const clean = raw.replace(/^```json\s*/,'').replace(/```\s*$/,'').trim();
        let parsed;
        try { parsed = JSON.parse(clean); } catch { parsed = null; }
        if (parsed && parsed.intent) {
          const { order, total } = matchItems(parsed, menu);
          return res.json({ intent: parsed.intent, items: order, total, message: parsed.message });
        }
      }
    } catch (err) { console.warn('Gemini unavailable:', err.message); }
  }

  // ── All AI failed → tell frontend to use local parser ─────────────────────
  res.json({ intent: 'no_ai', items: [], message: '' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));