import "./loadenv.js";
import { app } from "./app.js";
import http from "http";
import connectDB from "./db/connect.js";
import { initSocket } from "./sockets/socket.js";

const server = http.createServer(app);

// Initialize Socket.io and store instance on app so controllers can reach it via req.app.get("io")
const io = initSocket(server);
app.set("io", io);

// ─── Database & Server Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() =>
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`🚀 Server running on port ${PORT}`),
  ),
);
