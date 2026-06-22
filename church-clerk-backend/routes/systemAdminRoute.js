import express from "express";
const router = express.Router();
import financialGovernanceRouter from "./financeRoute/financialGovernanceRoute.js";
import {
  getAllChurches,
  getSystemChurchById,
  suspendChurch,
  unsuspendChurch,
  deleteChurch,
  getAllSystemUsers,
  getDashboardStats,
  getSystemRoles,
  getSystemUserById,
  updateSystemUser,
  deleteSystemUser,
  getSystemAuditLogs,
  getSystemAuditLogById,
  getSystemReferralSummary,
  getSystemReferralHistory,
  getGlobalAnnouncementWalletKpis,
  listChurchSenderIdRequests,
  approveChurchSenderId,
  rejectChurchSenderId,
  verifyUserEmailByAdmin
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
  "/sender-id/requests",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "read"),
  listChurchSenderIdRequests
);

router.patch(
  "/churches/:id/suspend",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "update"),
  suspendChurch
);
router.patch(
  "/churches/:id/unsuspend",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "update"),
  unsuspendChurch
);
router.delete(
  "/churches/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin"),
  requirePermission("settingsChurchProfile", "delete"),
  deleteChurch
);

router.patch(
  "/churches/:id/sender-id/approve",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "update"),
  approveChurchSenderId
);

router.patch(
  "/churches/:id/sender-id/reject",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsChurchProfile", "update"),
  rejectChurchSenderId
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
router.patch(
  "/users/:id/verify-email",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin"),
  requirePermission("settingsUsersRoles", "update"),
  verifyUserEmailByAdmin
);
router.delete(
  "/users/:id",
  protectAdmin,
  attachPermissions,
  authorizeRoles("superadmin"),
  requirePermission("settingsUsersRoles", "deactivate"),
  deleteSystemUser
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

// Mount additional admin subroutes
router.use("/", financialGovernanceRouter);

export default router;
