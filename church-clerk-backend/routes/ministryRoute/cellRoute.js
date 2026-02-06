import express from "express";
const router = express.Router();
import {getAllCells, getSingleCell, createCell, updateCell, deleteCell, addMemberToCell, searchMembersToAddToCell, getCellMembers, updateCellMemberRole, removeMemberFromCell, addCellMeeting, updateCellMeeting, deleteCellMeeting, getCellMeetings} from "../../controller/ministryController/cellController.js"
import { createCellAttendance, updateCellAttendance, deleteCellAttendance, getAllCellAttendances } from "../../controller/ministryController/cellAttendanceController.js";
import { createCellOffering, updateCellOffering, deleteCellOffering, getAllCellOfferings } from "../../controller/ministryController/cellOfferingController.js";
import { getMinistryKPI } from "../../controller/ministryController/groupController.js";
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/cells", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllCells);
router.get("/cells/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getSingleCell); 
router.post("/cells", protect, authorizeRoles("superadmin", "churchadmin", "admin"), createCell);
router.put("/cells/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateCell);
router.delete("/cells/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), deleteCell);


router.post("/cells/:id/members", protect, authorizeRoles("superadmin", "churchadmin", "admin"), addMemberToCell);
router.get("/cells/:id/members/search", protect, authorizeRoles("superadmin", "churchadmin", "admin"), searchMembersToAddToCell);
router.get("/cells/:id/members", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getCellMembers);
router.put("/cells/:id/members/:memberId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateCellMemberRole);
router.delete("/cells/:id/members/:memberId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), removeMemberFromCell);


router.post("/cells/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin", "admin"), addCellMeeting);
router.get("/cells/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getCellMeetings);
router.put("/cells/:id/meetings/:meetingId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateCellMeeting);
router.delete("/cells/:id/meetings/:meetingId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), deleteCellMeeting);


router.post("/cells/:cellId/attendances", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), createCellAttendance);
router.get("/cells/:cellId/attendances", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllCellAttendances);
router.put("/cells/:cellId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), updateCellAttendance);
router.delete("/cells/:cellId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), deleteCellAttendance);


router.post("/cells/:cellId/offerings", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), createCellOffering);
router.get("/cells/:cellId/offerings", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllCellOfferings);
router.put("/cells/:cellId/offerings/:offeringId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), updateCellOffering);
router.delete("/cells/:cellId/offerings/:offeringId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), deleteCellOffering);


router.get("/cells/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getMinistryKPI);


export default router
