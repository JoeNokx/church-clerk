import express from "express";
const router = express.Router();
import {getAllCells, getSingleCell, createCell, updateCell, deleteCell, addMemberToCell, searchMembersToAddToCell, getCellMembers, updateCellMemberRole, removeMemberFromCell, addCellMeeting, updateCellMeeting, deleteCellMeeting, getCellMeetings} from "../../controller/ministryController/cellController.js"
import { createCellAttendance, updateCellAttendance, deleteCellAttendance, getAllCellAttendances } from "../../controller/ministryController/cellAttendanceController.js";
import {
  createCellIndividualAttendance,
  getAllCellIndividualAttendances,
  getSingleCellIndividualAttendance,
  updateCellIndividualAttendance,
  deleteCellIndividualAttendance
} from "../../controller/ministryController/cellIndividualAttendanceController.js";
import { createCellOffering, updateCellOffering, deleteCellOffering, getAllCellOfferings } from "../../controller/ministryController/cellOfferingController.js";
import { getMinistryKPI } from "../../controller/ministryController/groupController.js";
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
  requirePermission("ministry", "read"),
  getAllCells
);
router.get(
  "/cells/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "view"),
  getSingleCell
); 
router.post(
  "/cells",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "create"),
  createCell
);
router.put(
  "/cells/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  updateCell
);
router.delete(
  "/cells/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "delete"),
  deleteCell
);


router.post(
  "/cells/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  addMemberToCell
);
router.get(
  "/cells/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  searchMembersToAddToCell
);
router.get(
  "/cells/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  getCellMembers
);
router.put(
  "/cells/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  updateCellMemberRole
);
router.delete(
  "/cells/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  removeMemberFromCell
);


router.post(
  "/cells/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "create"),
  addCellMeeting
);
router.get(
  "/cells/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  getCellMeetings
);
router.put(
  "/cells/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  updateCellMeeting
);
router.delete(
  "/cells/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "delete"),
  deleteCellMeeting
);


router.post(
  "/cells/:cellId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "create"),
  createCellAttendance
);
router.get(
  "/cells/:cellId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllCellAttendances
);
router.put(
  "/cells/:cellId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "update"),
  updateCellAttendance
);
router.delete(
  "/cells/:cellId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "delete"),
  deleteCellAttendance
);


router.post(
  "/cells/:cellId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "create"),
  createCellIndividualAttendance
);
router.get(
  "/cells/:cellId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllCellIndividualAttendances
);
router.get(
  "/cells/:cellId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getSingleCellIndividualAttendance
);
router.put(
  "/cells/:cellId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "update"),
  updateCellIndividualAttendance
);
router.delete(
  "/cells/:cellId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "delete"),
  deleteCellIndividualAttendance
);


router.post(
  "/cells/:cellId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "create"),
  createCellOffering
);
router.get(
  "/cells/:cellId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllCellOfferings
);
router.put(
  "/cells/:cellId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "update"),
  updateCellOffering
);
router.delete(
  "/cells/:cellId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "delete"),
  deleteCellOffering
);


router.get(
  "/cells/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  getMinistryKPI
);


export default router
