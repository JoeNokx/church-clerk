import express from "express";
const router = express.Router();
import {getAllChurches, getAllSystemUsers, getDashboardStats} from "../controller/systemAdminController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


// System admin only routes
router.get("/churches", protect, authorizeRoles("superadmin", "supportadmin"), getAllChurches);
router.get("/users", protect, authorizeRoles("superadmin"), getAllSystemUsers);
router.get("/dashboard/stats", protect, authorizeRoles("superadmin", "supportadmin"), getDashboardStats);

export default router;
