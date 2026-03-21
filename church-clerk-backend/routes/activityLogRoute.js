import express from "express";
const router = express.Router();
import {getAllActivityLogs, getSingleActivityLog } from "../controller/activityLogController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";


router.get(
  "/activity-logs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("churchadmin"),
  requirePermission("settings", "read"),
  getAllActivityLogs
);
router.get(
  "/activity-logs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("churchadmin"),
  requirePermission("settings", "read"),
  getSingleActivityLog
);


export default router
