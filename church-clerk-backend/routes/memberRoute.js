import express from "express"
const router = express.Router()
import {getAllMembers, getSingleMember, createMember, updateMember, deleteMember, getAllMembersKPI} from "../controller/memberController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import {blockMemberCreationIfOverdue} from "../middleware/blockMemberCreationMiddleware.js"


router.get("/get-members", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllMembers);
router.get("/get-members/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleMember); 
router.post("/create-members", protect, blockMemberCreationIfOverdue, authorizeRoles("superadmin", "churchadmin"), createMember);
router.put("/update-members/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateMember);
router.delete("/delete-members/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteMember);
router.get("/get-members-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllMembersKPI);

export default router 


