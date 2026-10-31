import "./loadenv.js";
import { app } from "./app.js";
import http from "http";
import connectDB from "./db/connect.js";
import { initSocket } from "./sockets/socket.js";

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
