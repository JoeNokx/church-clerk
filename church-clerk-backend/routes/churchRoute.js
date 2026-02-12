import express from "express";
const router = express.Router();
import { createMyChurch, searchHeadquartersChurches, getMyChurchProfile, updateMyChurchProfile, getMyBranches, getActiveChurchContext } from "../controller/churchController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   

router.get("/churches/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), getMyChurchProfile); 
router.post("/churches", protect, createMyChurch);
router.put("/churches/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), updateMyChurchProfile);
router.get("/branches", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), getMyBranches);
router.get("/active-context", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), getActiveChurchContext);
router.get("/churches", searchHeadquartersChurches);

export default router