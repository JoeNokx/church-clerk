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
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


// System admin only routes
router.get("/churches", protect, authorizeRoles("superadmin", "supportadmin"), getAllChurches);
router.get("/churches/:id", protect, authorizeRoles("superadmin", "supportadmin"), getSystemChurchById);
router.get("/roles", protect, authorizeRoles("superadmin", "supportadmin"), getSystemRoles);

router.get("/users", protect, authorizeRoles("superadmin", "supportadmin"), getAllSystemUsers);
router.get("/users/:id", protect, authorizeRoles("superadmin", "supportadmin"), getSystemUserById);
router.patch("/users/:id", protect, authorizeRoles("superadmin"), updateSystemUser);
router.get("/dashboard/stats", protect, authorizeRoles("superadmin", "supportadmin"), getDashboardStats);

router.get("/audit-logs", protect, authorizeRoles("superadmin", "supportadmin"), getSystemAuditLogs);
router.get("/audit-logs/:id", protect, authorizeRoles("superadmin", "supportadmin"), getSystemAuditLogById);

router.get("/referrals/summary", protect, authorizeRoles("superadmin", "supportadmin"), getSystemReferralSummary);
router.get("/referrals/history", protect, authorizeRoles("superadmin", "supportadmin"), getSystemReferralHistory);

router.get("/settings", protect, authorizeRoles("superadmin", "supportadmin"), getSystemSettings);
router.patch("/settings", protect, authorizeRoles("superadmin", "supportadmin"), updateSystemSettings);

export default router;
