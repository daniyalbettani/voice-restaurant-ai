import { Server } from "socket.io";
import { setIo } from "../routes/orders.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true, // Dynamically reflects the requesting origin (supports localhost & local IP)
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  setIo(io);

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔌 Disconnected:", socket.id);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};