import express from "express";
const router = express.Router();
import {getAllChurches, getAllSystemUsers, getDashboardStats} from "../controller/systemAdminController.js"
import {createPlan} from "../controller/systemAdminController.js"
import {getAllPlans} from "../controller/systemAdminController.js"
import { updatePlan } from "../controller/systemAdminController.js";
import { deletePlan } from "../controller/systemAdminController.js";
import {adminBillingDashboard} from "../controller/systemAdminController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


// System admin only routes
router.get("/all-churches", protect, authorizeRoles("superadmin", "supportadmin"), getAllChurches);
router.get("/all-users", protect, authorizeRoles("superadmin"), getAllSystemUsers);
router.get("/dashboard-stats", protect, authorizeRoles("superadmin", "supportadmin"), getDashboardStats);


router.post("/create-plans", protect, authorizeRoles("superadmin"), createPlan);
router.get("/get-plans", protect, authorizeRoles("superadmin"), getAllPlans);
router.put("/update-plans/:id", protect, authorizeRoles("superadmin"), updatePlan);
router.delete("/delete-plans/:id", protect, authorizeRoles("superadmin"), deletePlan);
router.get("/admin-billing-dashboard", protect, authorizeRoles("superadmin"), adminBillingDashboard);

export default router;
