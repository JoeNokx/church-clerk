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
  getSystemReferralHistory,
  getGlobalAnnouncementWalletKpis
} from "../controller/systemAdminController.js";
import {
  listSystemInAppAnnouncements,
  getSystemInAppAnnouncementById,
  createSystemInAppAnnouncement,
  updateSystemInAppAnnouncement,
  deleteSystemInAppAnnouncement
} from "../controller/systemInAppAnnouncementController.js";
import { getSystemSettings, updateSystemSettings } from "../controller/systemSettingsController.js";
import {
  getPermissionCatalog,
  listRoles,
  createRole,
  updateRole,
  getRoleById,
  deleteRole
} from "../controller/roleController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";


// System admin only routes
router.get(
  "/churches",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "read"),
  getAllChurches
);
router.get(
  "/churches/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "read"),
  getSystemChurchById
);
router.get(
  "/roles",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "read"),
  getSystemRoles
);

router.get(
  "/permission-catalog",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "read"),
  getPermissionCatalog
);
router.get(
  "/custom-roles",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "read"),
  listRoles
);
router.get(
  "/custom-roles/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "view"),
  getRoleById
);
router.post(
  "/custom-roles",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "create"),
  createRole
);
router.patch(
  "/custom-roles/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "create"),
  updateRole
);
router.delete(
  "/custom-roles/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "deactivate"),
  deleteRole
);

router.get(
  "/users",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "read"),
  getAllSystemUsers
);
router.get(
  "/users/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "view"),
  getSystemUserById
);
router.patch(
  "/users/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "create"),
  updateSystemUser
);
router.get(
  "/dashboard/stats",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("dashboard", "read"),
  getDashboardStats
);

router.get(
  "/audit-logs",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("support", "read"),
  getSystemAuditLogs
);
router.get(
  "/audit-logs/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("support", "view"),
  getSystemAuditLogById
);

router.get(
  "/referrals/summary",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("referrals", "read"),
  getSystemReferralSummary
);
router.get(
  "/referrals/history",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("referrals", "read"),
  getSystemReferralHistory
);

router.get(
  "/announcements/wallet-kpis",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("announcements", "read"),
  getGlobalAnnouncementWalletKpis
);

router.get(
  "/announcements/in-app",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("announcements", "read"),
  listSystemInAppAnnouncements
);
router.get(
  "/announcements/in-app/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("announcements", "view"),
  getSystemInAppAnnouncementById
);
router.post(
  "/announcements/in-app",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("announcements", "create"),
  createSystemInAppAnnouncement
);
router.patch(
  "/announcements/in-app/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("announcements", "update"),
  updateSystemInAppAnnouncement
);
router.delete(
  "/announcements/in-app/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("announcements", "delete"),
  deleteSystemInAppAnnouncement
);

router.get(
  "/settings",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "read"),
  getSystemSettings
);
router.patch(
  "/settings",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "update"),
  updateSystemSettings
);

export default router;
