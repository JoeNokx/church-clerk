import express from "express";
const router = express.Router();
import {getAllActivityLogs, getSingleActivityLog } from "../controller/activityLogController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get(
  "/activity-logs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("churchadmin"),
  getAllActivityLogs
);
router.get(
  "/activity-logs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("churchadmin"),
  getSingleActivityLog
);


export default router
