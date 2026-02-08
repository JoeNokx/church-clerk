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
import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";

// router.use(authorizeRoles("superadmin", "churchadmin", "financialofficer"));
// router.use(setActiveChurch);
// router.use(readOnlyBranchGuard);
// router.use(attachBillingBanner);
// router.use(attachPermissions);

// http://localhost:5100/api/v1/user/me
router.get(
  "/me",
  protect,
  authorizeRoles(
    "superadmin",
    "supportadmin",
    "churchadmin",
    "financialofficer",
    "secretary",
    "leader",
    "associateadmin"
  ),
  setActiveChurch,
  attachPermissions,
  myProfile
);
router.put("/me/profile", protect, uploadMemoryFile.single("avatar"), updateMyProfile);
router.put("/me/password", protect, updateMyPassword);

router.get(
  "/role-permissions",
  protect,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  setActiveChurch,
  readOnlyBranchGuard,
  getRolePermissionMatrix
);

router.get(
  "/church-users",
  protect,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  setActiveChurch,
  readOnlyBranchGuard,
  listChurchUsers
);

router.post(
  "/church-users",
  protect,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  setActiveChurch,
  readOnlyBranchGuard,
  createChurchUser
);

router.put(
  "/church-users/:id",
  protect,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  setActiveChurch,
  readOnlyBranchGuard,
  updateChurchUser
);

router.patch(
  "/church-users/:id/status",
  protect,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  setActiveChurch,
  readOnlyBranchGuard,
  setChurchUserActiveStatus
);


export default router;
