import { Router } from "express";
import { createMenuItem, getMenu, deleteMenuItem } from "../controllers/menu.controller.js";
import { authorizedRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

export const menuRouter = Router();

menuRouter.get("/", getMenu);
// upload.single("image") must be its own argument — createMenuItem goes AFTER as a separate argument
// also "admin" role doesn't exist — your roles are: staff, sub_admin, super_admin
menuRouter.post(
  "/create-item",
  verifyJWT,
  authorizedRoles("staff", "sub_admin", "super_admin"),
  upload.single("image"),
  createMenuItem
);
menuRouter.delete(
  "/:id",
  verifyJWT,
  authorizedRoles("staff", "sub_admin", "super_admin"),
  deleteMenuItem
);