import { Router } from "express";
import { menu } from "../controllers/menu.controller.js";

export const menuRouter = Router();

menuRouter.get("/", menu);
