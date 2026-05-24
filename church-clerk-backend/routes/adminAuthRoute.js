import express from "express";
const router = express.Router();

import { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin, getSystemAdminMe } from "../controller/adminAuthController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminLoginSchema, adminRegisterSchema } from "../validators/auth.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiters.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

router.post("/login", loginLimiter, validateRequest(adminLoginSchema), loginSystemAdmin);
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
  registerLimiter,
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin"),
  requirePermission("settingsUsersRoles", "create"),
  validateRequest(adminRegisterSchema),
  registerSystemAdmin
);

export default router;
