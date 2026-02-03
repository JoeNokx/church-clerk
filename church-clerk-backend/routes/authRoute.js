import express from "express";
const router = express.Router();

import {registerUser, loginUser, logoutUser, updatePassword} from "../controller/authController.js"

import { protect } from "../middleware/authMiddleware.js";
import {setActiveChurch} from "../middleware/activeChurchMiddleware.js";
import {attachBillingBanner} from "../middleware/expiryWarningMiddleware.js";
import {readOnlyBranchGuard} from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";


router.post("/register", registerUser); 
router.post("/login",  loginUser);
router.post("/logout", protect, logoutUser);
router.put("/password", protect, updatePassword);


export default router;
