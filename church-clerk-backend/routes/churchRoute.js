import express from "express";
const router = express.Router();
import { createMyChurch, searchHeadquartersChurches, getMyChurchProfile, updateMyChurchProfile, getMyBranches, getActiveChurchContext } from "../controller/churchController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

router.get(
  "/churches/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("settingsChurchProfile", "read"),
  getMyChurchProfile
); 
router.post("/churches", protect, createMyChurch);
router.put(
  "/churches/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("settingsChurchProfile", "update"),
  updateMyChurchProfile
);
router.get(
  "/branches",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("branches", "read"),
  getMyBranches
);
router.get(
  "/active-context",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("settingsChurchProfile", "read"),
  getActiveChurchContext
);

router.get("/churches", searchHeadquartersChurches);

export default router