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
  verifyUserEmailByAdmin,
  delegateChurchSession
} from "../controller/systemAdminController.js";
import {
  listSystemInAppAnnouncements,
  getSystemInAppAnnouncementById,
  createSystemInAppAnnouncement,
  updateSystemInAppAnnouncement,
  deleteSystemInAppAnnouncement
} from "../controller/systemInAppAnnouncementController.js";
import { runBillingCycle, runBillingCycleForChurch } from "../controller/billingController/subscriptionController.js";
import { getSystemSettings, updateSystemSettings } from "../controller/systemSettingsController.js";
import {
  getPermissionCatalog,
  listRoles,
  createRole,
  updateRole,
  getRoleById,
  deleteRole
} from "../controller/roleController.js";
import {
  getAllSupportRequests,
  getOpenTicketCount,
  getSupportRequestById,
  updateSupportRequestStatus
} from "../controller/supportRequestController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import requireSystemRole from "../middleware/requireSystemRole.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";


// System admin only routes
router.get(
  "/churches",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "read"),
  getAllChurches
);
router.get(
  "/churches/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "read"),
  getSystemChurchById
);

router.get(
  "/sender-id/requests",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "read"),
  listChurchSenderIdRequests
);

router.patch(
  "/churches/:id/suspend",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "update"),
  suspendChurch
);
router.patch(
  "/churches/:id/unsuspend",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "update"),
  unsuspendChurch
);
router.delete(
  "/churches/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "delete"),
  deleteChurch
);

// Delegated session: issues a short-lived JWT so a system admin can open
// the church-facing frontend as that church.
router.post(
  "/churches/:id/delegate",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "update"),
  delegateChurchSession
);

router.patch(
  "/churches/:id/sender-id/approve",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "update"),
  approveChurchSenderId
);

router.patch(
  "/churches/:id/sender-id/reject",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemChurches", "update"),
  rejectChurchSenderId
);
router.get(
  "/roles",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "read"),
  getSystemRoles
);

router.get(
  "/permission-catalog",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "read"),
  getPermissionCatalog
);
router.get(
  "/custom-roles",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "read"),
  listRoles
);
router.get(
  "/custom-roles/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "read"),
  getRoleById
);
router.post(
  "/custom-roles",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "create"),
  createRole
);
router.patch(
  "/custom-roles/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "update"),
  updateRole
);
router.delete(
  "/custom-roles/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemRoles", "delete"),
  deleteRole
);

router.get(
  "/users",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemUsers", "read"),
  getAllSystemUsers
);
router.get(
  "/users/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemUsers", "read"),
  getSystemUserById
);
router.patch(
  "/users/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemUsers", "update"),
  updateSystemUser
);
router.patch(
  "/users/:id/verify-email",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemUsers", "update"),
  verifyUserEmailByAdmin
);
router.delete(
  "/users/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemUsers", "delete"),
  deleteSystemUser
);
router.get(
  "/dashboard/stats",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("dashboard", "read"),
  getDashboardStats
);

router.get(
  "/audit-logs",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("settingsAuditLog", "read"),
  getSystemAuditLogs
);
router.get(
  "/audit-logs/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("settingsAuditLog", "read"),
  getSystemAuditLogById
);

router.get(
  "/referrals/summary",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("referrals", "read"),
  getSystemReferralSummary
);
router.get(
  "/referrals/history",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("referrals", "read"),
  getSystemReferralHistory
);

router.get(
  "/announcements/wallet-kpis",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("announcements", "read"),
  getGlobalAnnouncementWalletKpis
);

router.get(
  "/announcements/in-app",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("announcements", "read"),
  listSystemInAppAnnouncements
);
router.get(
  "/announcements/in-app/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("announcements", "read"),
  getSystemInAppAnnouncementById
);
router.post(
  "/announcements/in-app",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("announcements", "create"),
  createSystemInAppAnnouncement
);
router.patch(
  "/announcements/in-app/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("announcements", "update"),
  updateSystemInAppAnnouncement
);
router.delete(
  "/announcements/in-app/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("announcements", "delete"),
  deleteSystemInAppAnnouncement
);

router.get(
  "/settings",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemBilling", "read"),
  getSystemSettings
);
router.patch(
  "/settings",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemBilling", "update"),
  updateSystemSettings
);

router.post(
  "/dev/billing/run-cycle",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemBilling", "runCycle"),
  runBillingCycle
);

router.post(
  "/billing/run-cycle/:churchId",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemBilling", "runCycle"),
  runBillingCycleForChurch
);

router.get(
  "/support-requests/open-count",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "read"),
  getOpenTicketCount
);
router.get(
  "/support-requests",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "read"),
  getAllSupportRequests
);
router.get(
  "/support-requests/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "read"),
  getSupportRequestById
);
router.patch(
  "/support-requests/:id",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "update"),
  updateSupportRequestStatus
);

// Mount additional admin subroutes
router.use("/", financialGovernanceRouter);

export default router;
