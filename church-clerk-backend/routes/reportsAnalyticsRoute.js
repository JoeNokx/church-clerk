import express from "express";
const router = express.Router();

import {
  getReportsAnalytics,
  getReportsAnalyticsKpi,
  exportReportsAnalytics,
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport
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
  "/report/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  requirePermission("reportsAnalytics", "export"),
  exportReportsAnalyticsReport
);

export default router;
