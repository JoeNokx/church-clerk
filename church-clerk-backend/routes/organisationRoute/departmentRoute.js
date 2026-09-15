import express from "express";
const router = express.Router();
import {getAllDepartments, getSingleDepartment, createDepartment, updateDepartment, deleteDepartment, addMemberToDepartment, searchMembersToAddToDepartment, getDepartmentMembers, updateDepartmentMemberRole, removeMemberFromDepartment, addDepartmentMeeting, updateDepartmentMeeting, deleteDepartmentMeeting, getDepartmentMeetings} from "../../controller/organisationController/departmentController.js"    
import { createDepartmentAttendance, updateDepartmentAttendance, deleteDepartmentAttendance, getAllDepartmentAttendances } from "../../controller/organisationController/departmentAttendanceController.js";
import {
  createDepartmentIndividualAttendance,
  getAllDepartmentIndividualAttendances,
  getSingleDepartmentIndividualAttendance,
  updateDepartmentIndividualAttendance,
  deleteDepartmentIndividualAttendance
} from "../../controller/organisationController/departmentIndividualAttendanceController.js";
import { createDepartmentOffering, updateDepartmentOffering, deleteDepartmentOffering, getAllDepartmentOfferings } from "../../controller/organisationController/departmentOfferingController.js";
import { getOrganisationKPI } from "../../controller/organisationController/groupController.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.get(
  "/departments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllDepartments
);
router.get(
  "/departments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "view"),
  getSingleDepartment
); 
router.post(
  "/departments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "create"),
  createDepartment
);
router.put(
  "/departments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateDepartment
);
router.delete(
  "/departments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "delete"),
  deleteDepartment
);


router.post(
  "/departments/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  addMemberToDepartment
);
router.get(
  "/departments/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  searchMembersToAddToDepartment
);
router.get(
  "/departments/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getDepartmentMembers
);
router.put(
  "/departments/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateDepartmentMemberRole
);
router.delete(
  "/departments/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  removeMemberFromDepartment
);


router.post(
  "/departments/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "create"),
  addDepartmentMeeting
);
router.get(
  "/departments/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getDepartmentMeetings
);
router.put(
  "/departments/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "update"),
  updateDepartmentMeeting
);
router.delete(
  "/departments/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "delete"),
  deleteDepartmentMeeting
);


router.post(
  "/departments/:departmentId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  createDepartmentAttendance
);
router.get(
  "/departments/:departmentId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllDepartmentAttendances
);
router.put(
  "/departments/:departmentId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  updateDepartmentAttendance
);
router.delete(
  "/departments/:departmentId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  deleteDepartmentAttendance
);

router.post(
  "/departments/:departmentId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  createDepartmentIndividualAttendance
);
router.get(
  "/departments/:departmentId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllDepartmentIndividualAttendances
);
router.get(
  "/departments/:departmentId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getSingleDepartmentIndividualAttendance
);
router.put(
  "/departments/:departmentId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  updateDepartmentIndividualAttendance
);
router.delete(
  "/departments/:departmentId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "delete"),
  deleteDepartmentIndividualAttendance
);


router.post(
  "/departments/:departmentId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "create"),
  backdatingGuard({ dateField: "date", module: "departmentOffering", entityType: "departmentOffering" }),
  createDepartmentOffering
);
router.get(
  "/departments/:departmentId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllDepartmentOfferings
);
router.put(
  "/departments/:departmentId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  conditionalImmutableGuard(),
  updateDepartmentOffering
);


router.get(
  "/departments/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("organisation", "read"),
  getOrganisationKPI
);

export default router
