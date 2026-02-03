import express from "express"
const router = express.Router()
import {getAllMembers, getSingleMember, createMember, updateMember, deleteMember, getAllMembersKPI} from "../controller/memberController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import {blockMemberCreationIfOverdue} from "../middleware/blockMemberCreationMiddleware.js"


router.get("/members", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllMembers);
router.get("/members/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleMember); 
router.post("/members", protect, blockMemberCreationIfOverdue, authorizeRoles("superadmin", "churchadmin"), createMember);
router.put("/members/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateMember);
router.delete("/members/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteMember);
router.get("/members/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllMembersKPI);

export default router
