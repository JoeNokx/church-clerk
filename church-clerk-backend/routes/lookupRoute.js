import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

import { listLookupValues, createLookupValue, deleteLookupValue } from "../controller/lookupController.js";

const router = express.Router();

const allowedReadRoles = [
  "superadmin",
  "supportadmin",
  "churchclerkadmin",
  
];

const allowedWriteRoles = [
  "superadmin",
  "supportadmin",
  "churchclerkadmin",
  
];

router.get(
  "/",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles(...allowedReadRoles),
  requirePermission("settingsChurchProfile", "read"),
  listLookupValues
);
router.post(
  "/",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles(...allowedWriteRoles),
  requirePermission("settingsChurchProfile", "update"),
  createLookupValue
);
router.delete(
  "/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles(...allowedWriteRoles),
  requirePermission("settingsChurchProfile", "update"),
  deleteLookupValue
);

export default router;
