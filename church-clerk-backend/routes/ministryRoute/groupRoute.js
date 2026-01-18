import express from "express";
const router = express.Router();
import {getAllGroups, getSingleGroup, createGroup, updateGroup, deleteGroup, addMemberToGroup, getGroupMembers,updateMemberRole, removeMemberFromGroup, addMeeting, updateMeeting, deleteMeeting, getMeetings, getMinistryKPI } from "../../controller/ministryController/groupController.js"

import  {createGroupAttendance, updateGroupAttendance, deleteGroupAttendance, getAllGroupAttendances} from "../../controller/ministryController/groupAttendanceController.js"
import  {createGroupOffering, updateGroupOffering, deleteGroupOffering, getAllGroupOfferings} from "../../controller/ministryController/groupOfferingController.js"

// import {
//      createGroupAttendance, updateGroupAttendance, deleteGroupAttendance, getAllGroupAttendances
// } from "../../controller/ministryController/groupAttendanceController.js"


import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/get-groups", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllGroups);
router.get("/get-groups/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleGroup); 
router.post("/create-groups", protect, authorizeRoles("superadmin", "churchadmin"), createGroup);
router.put("/update-groups/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateGroup);
router.delete("/delete-groups/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteGroup);


router.post("/get-groups/:id/add-member", protect, authorizeRoles("superadmin", "churchadmin"), addMemberToGroup);
router.get("/get-groups/:id/members", protect, authorizeRoles("superadmin", "churchadmin"), getGroupMembers);
router.put("/get-groups/:id/members/:memberId/", protect, authorizeRoles("superadmin", "churchadmin"), updateMemberRole);
router.delete("/get-groups/:id/members/:memberId/", protect, authorizeRoles("superadmin", "churchadmin"), removeMemberFromGroup);


router.post("/get-groups/:id/add-meeting", protect, authorizeRoles("superadmin", "churchadmin"), addMeeting);
router.get("/get-groups/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin"), getMeetings);
router.put("/get-groups/:id/meetings/:meetingId/", protect, authorizeRoles("superadmin", "churchadmin"), updateMeeting);
router.delete("/get-groups/:id/meetings/:meetingId/", protect, authorizeRoles("superadmin", "churchadmin"), deleteMeeting);


router.get("/get-ministry-kpi", protect, authorizeRoles("superadmin", "churchadmin"), getMinistryKPI);

router.post("/get-groups/:groupId/attendances", protect, authorizeRoles("superadmin", "churchadmin"), createGroupAttendance);
router.get("/get-groups/:groupId/attendances", protect, authorizeRoles("superadmin", "churchadmin"), getAllGroupAttendances);
router.put("/get-groups/:groupId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin"), updateGroupAttendance);
router.delete("/get-groups/:groupId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin"), deleteGroupAttendance);


router.post("/get-groups/:groupId/offering", protect, authorizeRoles("superadmin", "churchadmin"), createGroupOffering);
router.get("/get-groups/:groupId/offering", protect, authorizeRoles("superadmin", "churchadmin"), getAllGroupOfferings);
router.put("/get-groups/:groupId/offering/:offeringId", protect, authorizeRoles("superadmin", "churchadmin"), updateGroupOffering);
router.delete("/get-groups/:groupId/offering/:offeringId", protect, authorizeRoles("superadmin", "churchadmin"), deleteGroupOffering);

export default router
