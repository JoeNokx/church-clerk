import express from "express";
const router = express.Router();
import {
  getAllChurches,
  getSystemChurchById,
  getAllSystemUsers,
  getDashboardStats,
  getSystemRoles,
  getSystemUserById,
  updateSystemUser,
  getSystemAuditLogs,
  getSystemAuditLogById,
  getSystemReferralSummary,
  getSystemReferralHistory
} from "../controller/systemAdminController.js";
import { getSystemSettings, updateSystemSettings } from "../controller/systemSettingsController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


// System admin only routes
router.get("/churches", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getAllChurches);
router.get("/churches/:id", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemChurchById);
router.get("/roles", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemRoles);

router.get("/users", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getAllSystemUsers);
router.get("/users/:id", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemUserById);
router.patch("/users/:id", protectAdmin, authorizeRoles("superadmin", "supportadmin"), updateSystemUser);
router.get("/dashboard/stats", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getDashboardStats);

router.get("/audit-logs", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemAuditLogs);
router.get("/audit-logs/:id", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemAuditLogById);

router.get("/referrals/summary", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemReferralSummary);
router.get("/referrals/history", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemReferralHistory);

router.get("/settings", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemSettings);
router.patch("/settings", protectAdmin, authorizeRoles("superadmin", "supportadmin"), updateSystemSettings);

export default router;
