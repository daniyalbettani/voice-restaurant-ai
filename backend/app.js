import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// ─── Flexible CORS Setup (Supports Local IP & Localhost) ─────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, Postman, or requests without an origin header
    if (!origin) return callback(null, true);

    // Matches localhost, 127.0.0.1, or local network IPs (e.g. 192.168.x.x)
    const isLocalNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (
      isLocalNetwork ||
      process.env.CORS_ORIGIN === "*" ||
      origin === process.env.FRONTEND_URL
    ) {
      callback(null, true);
    } else {
      callback(null, false); // Block quietly without triggering an Express 500 error
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// ─── Global Middlewares ───────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

export { app };