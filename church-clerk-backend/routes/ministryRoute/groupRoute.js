import express from "express";
const router = express.Router();
import {getAllGroups, getSingleGroup, createGroup, updateGroup, deleteGroup, searchMembersToAddToGroup, addMemberToGroup, getGroupMembers,updateMemberRole, removeMemberFromGroup, addMeeting, updateMeeting, deleteMeeting, getMeetings, getMinistryKPI } from "../../controller/ministryController/groupController.js"

import  {createGroupAttendance, updateGroupAttendance, deleteGroupAttendance, getAllGroupAttendances} from "../../controller/ministryController/groupAttendanceController.js"
import {
  createGroupIndividualAttendance,
  getAllGroupIndividualAttendances,
  getSingleGroupIndividualAttendance,
  updateGroupIndividualAttendance,
  deleteGroupIndividualAttendance
} from "../../controller/ministryController/groupIndividualAttendanceController.js";
import  {createGroupOffering, updateGroupOffering, deleteGroupOffering, getAllGroupOfferings} from "../../controller/ministryController/groupOfferingController.js"

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.get(
  "/groups",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllGroups
);
router.get(
  "/groups/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getSingleGroup
); 
router.post(
  "/groups",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "create"),
  createGroup
);
router.put(
  "/groups/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  updateGroup
);
router.delete(
  "/groups/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "delete"),
  deleteGroup
);


router.post(
  "/groups/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  addMemberToGroup
);
router.get(
  "/groups/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  searchMembersToAddToGroup
);
router.get(
  "/groups/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getGroupMembers
);
router.put(
  "/groups/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  updateMemberRole
);
router.delete(
  "/groups/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  removeMemberFromGroup
);


router.post(
  "/groups/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "create"),
  addMeeting
);
router.get(
  "/groups/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getMeetings
);
router.put(
  "/groups/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  updateMeeting
);
router.delete(
  "/groups/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "delete"),
  deleteMeeting
);


router.get(
  "/groups/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getMinistryKPI
);

router.post(
  "/groups/:groupId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "create"),
  createGroupAttendance
);
router.get(
  "/groups/:groupId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getAllGroupAttendances
);
router.put(
  "/groups/:groupId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  updateGroupAttendance
);
router.delete(
  "/groups/:groupId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "delete"),
  deleteGroupAttendance
);

router.post(
  "/groups/:groupId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "create"),
  createGroupIndividualAttendance
);
router.get(
  "/groups/:groupId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getAllGroupIndividualAttendances
);
router.get(
  "/groups/:groupId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getSingleGroupIndividualAttendance
);
router.put(
  "/groups/:groupId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  updateGroupIndividualAttendance
);
router.delete(
  "/groups/:groupId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "delete"),
  deleteGroupIndividualAttendance
);


router.post(
  "/groups/:groupId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "create"),
  createGroupOffering
);
router.get(
  "/groups/:groupId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "read"),
  getAllGroupOfferings
);
router.put(
  "/groups/:groupId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "update"),
  updateGroupOffering
);
router.delete(
  "/groups/:groupId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("ministry", "delete"),
  deleteGroupOffering
);

export default router
