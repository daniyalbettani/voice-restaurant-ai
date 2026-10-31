import { Router } from "express";
import { getMenu } from "../controllers/menu.controller.js";

export const menuRouter = Router();

menuRouter.get("/", getMenu);
