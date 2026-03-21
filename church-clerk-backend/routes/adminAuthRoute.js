import express from "express";
const router = express.Router();

import { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin, getSystemAdminMe } from "../controller/adminAuthController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

router.post("/login", loginSystemAdmin);
router.get(
  "/me",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("dashboard", "read"),
  getSystemAdminMe
);
router.post(
  "/logout",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("dashboard", "read"),
  logoutSystemAdmin
);
router.post(
  "/register",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin"),
  requirePermission("settingsUsersRoles", "create"),
  registerSystemAdmin
);

export default router;
