import express from "express";
const router = express.Router();
import {
  myProfile,
  updateMyProfile,
  updateMyPassword,
  listChurchUsers,
  createChurchUser,
  updateChurchUser,
  setChurchUserActiveStatus,
  getRolePermissionMatrix
} from "../controller/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import {setActiveChurch} from "../middleware/activeChurchMiddleware.js";
import {attachBillingBanner} from "../middleware/expiryWarningMiddleware.js";
import {readOnlyBranchGuard} from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";
import { blockUserCreationIfOverLimit } from "../middleware/blockUserCreationMiddleware.js";

// router.use(authorizeRoles("superadmin", "churchadmin", "financialofficer"));
// router.use(setActiveChurch);
// router.use(readOnlyBranchGuard);
// router.use(attachBillingBanner);
// router.use(attachPermissions);

// http://localhost:5100/api/v1/user/me
router.get(
  "/me",
  protect,
  setActiveChurch,
  attachPermissions,
  requirePermission("settingsMyProfile", "read"),
  myProfile
);
router.put(
  "/me/profile",
  protect,
  attachPermissions,
  requirePermission("settingsMyProfile", "update"),
  uploadMemoryFile.single("avatar"),
  updateMyProfile
);
router.put(
  "/me/password",
  protect,
  attachPermissions,
  requirePermission("settingsMyProfile", "update"),
  updateMyPassword
);

router.get(
  "/role-permissions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  requirePermission("settingsUsersRoles", "read"),
  getRolePermissionMatrix
);

router.get(
  "/church-users",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  requirePermission("settingsUsersRoles", "read"),
  listChurchUsers
);

router.post(
  "/church-users",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  blockUserCreationIfOverLimit,
  requirePermission("settingsUsersRoles", "create"),
  createChurchUser
);

router.put(
  "/church-users/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  requirePermission("settingsUsersRoles", "view"),
  updateChurchUser
);

router.patch(
  "/church-users/:id/status",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  requirePermission("settingsUsersRoles", "deactivate"),
  setChurchUserActiveStatus
);


export default router;
