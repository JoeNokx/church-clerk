import express from "express";
const router = express.Router();
import { myProfile, updateMyProfile, updateMyPassword} from "../controller/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import {setActiveChurch} from "../middleware/activeChurchMiddleware.js";
import {attachBillingBanner} from "../middleware/expiryWarningMiddleware.js";
import {readOnlyBranchGuard} from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";

// router.use(authorizeRoles("superadmin", "churchadmin", "financialofficer"));
// router.use(setActiveChurch);
// router.use(readOnlyBranchGuard);
// router.use(attachBillingBanner);
// router.use(attachPermissions);

// http://localhost:5100/api/v1/user/me
router.get("/me", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), setActiveChurch, attachPermissions, myProfile);
router.put("/me/profile", protect, updateMyProfile);
router.put("/me/password", protect, updateMyPassword);


export default router;
