import express from "express";
const router = express.Router();

import {
  getReportsAnalytics,
  getReportsAnalyticsKpi,
  exportReportsAnalytics,
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport,
  getReportEntities,
  createSavedReport,
  getSavedReports,
  getSavedReport,
  deleteSavedReport,
  downloadSavedReport,
  getSharedReport,
  downloadSharedReport
} from "../controller/reportsAnalyticsController.js";

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

router.get(
  "/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "read"),
  getReportsAnalyticsKpi
);

router.get(
  "/analytics",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "read"),
  getReportsAnalytics
);

router.get(
  "/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "export"),
  exportReportsAnalytics
);

router.get(
  "/report",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "generate"),
  getReportsAnalyticsReport
);

router.get(
  "/report/entities",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "generate"),
  getReportEntities
);

router.get(
  "/report/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "export"),
  exportReportsAnalyticsReport
);

router.post(
  "/report/saved",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "generate"),
  createSavedReport
);

router.get(
  "/report/saved",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "read"),
  getSavedReports
);

router.get(
  "/report/saved/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "read"),
  getSavedReport
);

router.delete(
  "/report/saved/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "generate"),
  deleteSavedReport
);

router.get(
  "/report/saved/:id/download",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "export"),
  downloadSavedReport
);

// Public share endpoints (token-gated, no auth)
router.get("/shared/:token", getSharedReport);
router.get("/shared/:token/download", downloadSharedReport);

export default router;
