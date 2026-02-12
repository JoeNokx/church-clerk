import express from "express";
import { getMyReferralCode, getReferralHistory } from "../controller/referralSystemController.js";

import { protect } from "../middleware/authMiddleware.js";
import {setActiveChurch} from "../middleware/activeChurchMiddleware.js";
import {readOnlyBranchGuard} from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   


const router = express.Router();

router.get("/my-referral-code", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getMyReferralCode);
router.get("/my-referral-history", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getReferralHistory);

export default router;
