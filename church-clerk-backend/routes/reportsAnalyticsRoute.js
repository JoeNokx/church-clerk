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

router.get(
  "/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  getReportsAnalyticsKpi
);

router.get(
  "/analytics",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  getReportsAnalytics
);

router.get(
  "/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  exportReportsAnalytics
);

router.get(
  "/report",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  getReportsAnalyticsReport
);

router.get(
  "/report/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "leader"),
  exportReportsAnalyticsReport
);

export default router;
