import express from "express";
const router = express.Router();
import { createMyChurch, searchHeadquartersChurches, getMyChurchProfile, updateMyChurchProfile, getMyBranches, getActiveChurchContext } from "../controller/churchController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";   


router.get("/get-church-profile/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getMyChurchProfile); 
router.post("/create-church", protect, createMyChurch);
router.put("/update-church-profile/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateMyChurchProfile);
router.get("/get-church-branches", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getMyBranches);
router.get("/get-active-church-context", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getActiveChurchContext);
router.get("/search-headquarters-churches", searchHeadquartersChurches);


export default router