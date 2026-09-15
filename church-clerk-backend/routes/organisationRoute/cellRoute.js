import express from "express";
const router = express.Router();
import {getAllCells, getSingleCell, createCell, updateCell, deleteCell, addMemberToCell, searchMembersToAddToCell, getCellMembers, updateCellMemberRole, removeMemberFromCell, addCellMeeting, updateCellMeeting, deleteCellMeeting, getCellMeetings} from "../../controller/organisationController/cellController.js"
import { createCellAttendance, updateCellAttendance, deleteCellAttendance, getAllCellAttendances } from "../../controller/organisationController/cellAttendanceController.js";
import {
  createCellIndividualAttendance,
  getAllCellIndividualAttendances,
  getSingleCellIndividualAttendance,
  updateCellIndividualAttendance,
  deleteCellIndividualAttendance
} from "../../controller/organisationController/cellIndividualAttendanceController.js";
import { createCellOffering, updateCellOffering, deleteCellOffering, getAllCellOfferings } from "../../controller/organisationController/cellOfferingController.js";
import { getOrganisationKPI } from "../../controller/organisationController/groupController.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.get(
  "/cells",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllCells
);
router.get(
  "/cells/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "view"),
  getSingleCell
); 
router.post(
  "/cells",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "create"),
  createCell
);
router.put(
  "/cells/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateCell
);
router.delete(
  "/cells/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "delete"),
  deleteCell
);


router.post(
  "/cells/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  addMemberToCell
);
router.get(
  "/cells/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  searchMembersToAddToCell
);
router.get(
  "/cells/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getCellMembers
);
router.put(
  "/cells/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateCellMemberRole
);
router.delete(
  "/cells/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  removeMemberFromCell
);


router.post(
  "/cells/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "create"),
  addCellMeeting
);
router.get(
  "/cells/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getCellMeetings
);
router.put(
  "/cells/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateCellMeeting
);
router.delete(
  "/cells/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "delete"),
  deleteCellMeeting
);


router.post(
  "/cells/:cellId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  createCellAttendance
);
router.get(
  "/cells/:cellId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllCellAttendances
);
router.put(
  "/cells/:cellId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  updateCellAttendance
);
router.delete(
  "/cells/:cellId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  deleteCellAttendance
);


router.post(
  "/cells/:cellId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  createCellIndividualAttendance
);
router.get(
  "/cells/:cellId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllCellIndividualAttendances
);
router.get(
  "/cells/:cellId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getSingleCellIndividualAttendance
);
router.put(
  "/cells/:cellId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  updateCellIndividualAttendance
);
router.delete(
  "/cells/:cellId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  deleteCellIndividualAttendance
);


router.post(
  "/cells/:cellId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  backdatingGuard({ dateField: "date", module: "cellOffering", entityType: "cellOffering" }),
  createCellOffering
);
router.get(
  "/cells/:cellId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllCellOfferings
);
router.put(
  "/cells/:cellId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  conditionalImmutableGuard(),
  updateCellOffering
);


router.get(
  "/cells/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getOrganisationKPI
);


export default router
