import express from "express";
const router = express.Router();
import {getAllGroups, getSingleGroup, createGroup, updateGroup, deleteGroup, addMemberToGroup, getGroupMembers,updateMemberRole, removeMemberFromGroup, addMeeting, updateMeeting, deleteMeeting, getMeetings, getMinistryKPI } from "../../controller/ministryController/groupController.js"

import  {createGroupAttendance, updateGroupAttendance, deleteGroupAttendance, getAllGroupAttendances} from "../../controller/ministryController/groupAttendanceController.js"
import  {createGroupOffering, updateGroupOffering, deleteGroupOffering, getAllGroupOfferings} from "../../controller/ministryController/groupOfferingController.js"

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/groups", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllGroups);
router.get("/groups/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleGroup); 
router.post("/groups", protect, authorizeRoles("superadmin", "churchadmin"), createGroup);
router.put("/groups/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateGroup);
router.delete("/groups/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteGroup);


router.post("/groups/:id/members", protect, authorizeRoles("superadmin", "churchadmin"), addMemberToGroup);
router.get("/groups/:id/members", protect, authorizeRoles("superadmin", "churchadmin"), getGroupMembers);
router.put("/groups/:id/members/:memberId", protect, authorizeRoles("superadmin", "churchadmin"), updateMemberRole);
router.delete("/groups/:id/members/:memberId", protect, authorizeRoles("superadmin", "churchadmin"), removeMemberFromGroup);


router.post("/groups/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin"), addMeeting);
router.get("/groups/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin"), getMeetings);
router.put("/groups/:id/meetings/:meetingId", protect, authorizeRoles("superadmin", "churchadmin"), updateMeeting);
router.delete("/groups/:id/meetings/:meetingId", protect, authorizeRoles("superadmin", "churchadmin"), deleteMeeting);


router.get("/groups/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin"), getMinistryKPI);

router.post("/groups/:groupId/attendances", protect, authorizeRoles("superadmin", "churchadmin"), createGroupAttendance);
router.get("/groups/:groupId/attendances", protect, authorizeRoles("superadmin", "churchadmin"), getAllGroupAttendances);
router.put("/groups/:groupId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin"), updateGroupAttendance);
router.delete("/groups/:groupId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin"), deleteGroupAttendance);


router.post("/groups/:groupId/offerings", protect, authorizeRoles("superadmin", "churchadmin"), createGroupOffering);
router.get("/groups/:groupId/offerings", protect, authorizeRoles("superadmin", "churchadmin"), getAllGroupOfferings);
router.put("/groups/:groupId/offerings/:offeringId", protect, authorizeRoles("superadmin", "churchadmin"), updateGroupOffering);
router.delete("/groups/:groupId/offerings/:offeringId", protect, authorizeRoles("superadmin", "churchadmin"), deleteGroupOffering);

export default router
