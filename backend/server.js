import "./loadenv.js";
import { app } from "./app.js";
import http from "http";
import connectDB from "./db/connect.js";
import { initSocket } from "./sockets/socket.js";
import authRouter from "./routes/auth.js";
import menuRouter from "./routes/menu.js";
import orderRouter from "./routes/orders.js";
import aiRouter from "./routes/ai.js";

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// ─── Database & Server Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() =>
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`🚀 Server running on port ${PORT}`),
  ),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", authRouter);
app.use("/api/menu", menuRouter);
app.use("/api", orderRouter);
app.use("/api", aiRouter);

// ─── 404 Catch-All ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});
