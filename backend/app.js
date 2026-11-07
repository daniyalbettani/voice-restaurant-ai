import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

const corsOptions = {
  origin: true, // Dynamically reflects request origin to allow all domains while preserving cookies/headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

// ROUTES

import { authRouter } from "./routes/auth.routes.js";
app.use("/api/auth", authRouter);

import { menuRouter } from "./routes/menu.js";
app.use("/api/menu", menuRouter);

import { cartRouter } from "./routes/cart.js";
app.use("/api/cart", cartRouter);

import { OrderRouter } from "./routes/orders.js";
app.use("/api", OrderRouter);

import { voiceParseRouter } from "./routes/ai.js";
app.use("/api", voiceParseRouter);

app.use(errorHandler);

export { app };
