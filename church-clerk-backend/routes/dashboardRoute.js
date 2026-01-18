import express from "express";
const router = express.Router();
import {getDashboardKPI, getDashboardAnalytics, getDashboardWidget } from "../controller/dashboardController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get("/get-dashboard-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getDashboardKPI);
router.get("/get-dashboard-analytics", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getDashboardAnalytics);
router.get("/get-dashboard-widget", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getDashboardWidget);


export default router