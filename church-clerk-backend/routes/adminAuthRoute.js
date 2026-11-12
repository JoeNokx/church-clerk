import express from "express";
const router = express.Router();

import { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin, getSystemAdminMe, changeAdminEmail, forgotAdminPassword, resetAdminPassword } from "../controller/adminAuthController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminLoginSchema, adminRegisterSchema } from "../validators/auth.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiters.js";
import { requireUserRole } from "../middleware/roleMiddleware.js";
import requireSystemRole from "../middleware/requireSystemRole.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

router.post("/login", loginLimiter, validateRequest(adminLoginSchema), loginSystemAdmin);
router.put("/me/email", protectAdmin, requireSystemRole, changeAdminEmail);
router.post("/forgot-password", loginLimiter, forgotAdminPassword);
router.post("/reset-password", resetAdminPassword);
router.get(
  "/me",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  getSystemAdminMe
);
router.post(
  "/logout",
  protectAdmin,
  logoutSystemAdmin
);
router.post(
  "/register",
  registerLimiter,
  protectAdmin,
  attachPermissions,
  requireUserRole("superadmin"),
  requirePermission("systemUsers", "create"),
  validateRequest(adminRegisterSchema),
  registerSystemAdmin
);

export default router;
