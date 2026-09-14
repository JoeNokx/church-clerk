import express from "express";
const router = express.Router();
import {getAllMinistries, getSingleMinistry, createMinistry, updateMinistry, deleteMinistry, addMemberToMinistry, searchMembersToAddToMinistry, getMinistryMembers, updateMinistryMemberRole, removeMemberFromMinistry, addMinistryMeeting, updateMinistryMeeting, deleteMinistryMeeting, getMinistryMeetings} from "../../controller/organisationController/ministryController.js"
import { createMinistryAttendance, updateMinistryAttendance, deleteMinistryAttendance, getAllMinistryAttendances } from "../../controller/organisationController/ministryAttendanceController.js";
import {
  createMinistryIndividualAttendance,
  getAllMinistryIndividualAttendances,
  getSingleMinistryIndividualAttendance,
  updateMinistryIndividualAttendance,
  deleteMinistryIndividualAttendance
} from "../../controller/organisationController/ministryIndividualAttendanceController.js";
import { createMinistryOffering, updateMinistryOffering, deleteMinistryOffering, getAllMinistryOfferings } from "../../controller/organisationController/ministryOfferingController.js";
import { getOrganisationKPI } from "../../controller/organisationController/groupController.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.get(
  "/ministries",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllMinistries
);
router.get(
  "/ministries/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "view"),
  getSingleMinistry
);
router.post(
  "/ministries",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "create"),
  createMinistry
);
router.put(
  "/ministries/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateMinistry
);
router.delete(
  "/ministries/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "delete"),
  deleteMinistry
);


router.post(
  "/ministries/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  addMemberToMinistry
);
router.get(
  "/ministries/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  searchMembersToAddToMinistry
);
router.get(
  "/ministries/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getMinistryMembers
);
router.put(
  "/ministries/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateMinistryMemberRole
);
router.delete(
  "/ministries/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  removeMemberFromMinistry
);


router.post(
  "/ministries/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "create"),
  addMinistryMeeting
);
router.get(
  "/ministries/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getMinistryMeetings
);
router.put(
  "/ministries/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateMinistryMeeting
);
router.delete(
  "/ministries/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "delete"),
  deleteMinistryMeeting
);


router.post(
  "/ministries/:ministryId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  createMinistryAttendance
);
router.get(
  "/ministries/:ministryId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllMinistryAttendances
);
router.put(
  "/ministries/:ministryId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  updateMinistryAttendance
);
router.delete(
  "/ministries/:ministryId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  deleteMinistryAttendance
);


router.post(
  "/ministries/:ministryId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  createMinistryIndividualAttendance
);
router.get(
  "/ministries/:ministryId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllMinistryIndividualAttendances
);
router.get(
  "/ministries/:ministryId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getSingleMinistryIndividualAttendance
);
router.put(
  "/ministries/:ministryId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  updateMinistryIndividualAttendance
);
router.delete(
  "/ministries/:ministryId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  deleteMinistryIndividualAttendance
);


router.post(
  "/ministries/:ministryId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  backdatingGuard({ dateField: "date", module: "ministryOffering", entityType: "ministryOffering" }),
  createMinistryOffering
);
router.get(
  "/ministries/:ministryId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllMinistryOfferings
);
router.put(
  "/ministries/:ministryId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  conditionalImmutableGuard(),
  updateMinistryOffering
);
router.delete(
  "/ministries/:ministryId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  conditionalImmutableGuard(),
  deleteMinistryOffering
);


router.get(
  "/ministries/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getOrganisationKPI
);


export default router
