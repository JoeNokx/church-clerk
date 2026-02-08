import express from "express"
const router = express.Router()
import {getAllMembers, getSingleMember, createMember, updateMember, deleteMember, getAllMembersKPI} from "../controller/memberController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import {blockMemberCreationIfOverdue} from "../middleware/blockMemberCreationMiddleware.js"


router.get("/members", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllMembers);
router.get("/members/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getSingleMember); 
router.post(
  "/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  blockMemberCreationIfOverdue,
  authorizeRoles("superadmin", "churchadmin"),
  createMember
);
router.put("/members/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateMember);
router.delete("/members/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteMember);
router.get(
  "/members/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  getAllMembersKPI
);

export default router
