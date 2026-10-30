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

import authRoutes from "./routes/auth.routes.js";

app.use("/api/v1/auth", authRoutes);

app.use(errorHandler);

export { app };
