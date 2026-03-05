import express from "express";
const router = express.Router();
import {getDashboardKPI, getDashboardAnalytics, getDashboardWidget, getDashboardSummary, getDashboardChart, getDashboardRecentOfferings } from "../controller/dashboardController.js"
import { protect } from "../middleware/authMiddleware.js";
import {setActiveChurch} from "../middleware/activeChurchMiddleware.js";
import {readOnlyBranchGuard} from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get("/kpi", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getDashboardKPI);
router.get("/analytics", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getDashboardAnalytics);
router.get("/widgets", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getDashboardWidget);

router.get("/summary", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getDashboardSummary);
router.get("/chart", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getDashboardChart);
router.get("/recent-offerings", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getDashboardRecentOfferings);


export default router