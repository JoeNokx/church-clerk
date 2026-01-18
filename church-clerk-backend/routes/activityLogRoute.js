import express from "express";
const router = express.Router();
import {getAllActivityLogs, getSingleActivityLog } from "../controller/activityLogController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get("/get-activity-logs", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllActivityLogs);
router.get("/get-activity-log/:id", protect, authorizeRoles("superadmin", "admin"), getSingleActivityLog);


export default router
