import express from "express";
const router = express.Router();
import {getAllDepartments, getSingleDepartment, createDepartment, updateDepartment, deleteDepartment, addMemberToDepartment, searchMembersToAddToDepartment, getDepartmentMembers, updateDepartmentMemberRole, removeMemberFromDepartment, addDepartmentMeeting, updateDepartmentMeeting, deleteDepartmentMeeting, getDepartmentMeetings} from "../../controller/ministryController/departmentController.js"    
import { createDepartmentAttendance, updateDepartmentAttendance, deleteDepartmentAttendance, getAllDepartmentAttendances } from "../../controller/ministryController/departmentAttendanceController.js";
import {
  createDepartmentIndividualAttendance,
  getAllDepartmentIndividualAttendances,
  getSingleDepartmentIndividualAttendance,
  updateDepartmentIndividualAttendance,
  deleteDepartmentIndividualAttendance
} from "../../controller/ministryController/departmentIndividualAttendanceController.js";
import { createDepartmentOffering, updateDepartmentOffering, deleteDepartmentOffering, getAllDepartmentOfferings } from "../../controller/ministryController/departmentOfferingController.js";
import { getMinistryKPI } from "../../controller/ministryController/groupController.js";
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
  requirePermission("ministry", "read"),
  getAllDepartments
);
router.get(
  "/departments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "view"),
  getSingleDepartment
); 
router.post(
  "/departments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "create"),
  createDepartment
);
router.put(
  "/departments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  updateDepartment
);
router.delete(
  "/departments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "delete"),
  deleteDepartment
);


router.post(
  "/departments/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  addMemberToDepartment
);
router.get(
  "/departments/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  searchMembersToAddToDepartment
);
router.get(
  "/departments/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  getDepartmentMembers
);
router.put(
  "/departments/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  updateDepartmentMemberRole
);
router.delete(
  "/departments/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  removeMemberFromDepartment
);


router.post(
  "/departments/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "create"),
  addDepartmentMeeting
);
router.get(
  "/departments/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  getDepartmentMeetings
);
router.put(
  "/departments/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "update"),
  updateDepartmentMeeting
);
router.delete(
  "/departments/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "delete"),
  deleteDepartmentMeeting
);


router.post(
  "/departments/:departmentId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "create"),
  createDepartmentAttendance
);
router.get(
  "/departments/:departmentId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllDepartmentAttendances
);
router.put(
  "/departments/:departmentId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "update"),
  updateDepartmentAttendance
);
router.delete(
  "/departments/:departmentId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "delete"),
  deleteDepartmentAttendance
);

router.post(
  "/departments/:departmentId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "create"),
  createDepartmentIndividualAttendance
);
router.get(
  "/departments/:departmentId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllDepartmentIndividualAttendances
);
router.get(
  "/departments/:departmentId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getSingleDepartmentIndividualAttendance
);
router.put(
  "/departments/:departmentId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "update"),
  updateDepartmentIndividualAttendance
);
router.delete(
  "/departments/:departmentId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "delete"),
  deleteDepartmentIndividualAttendance
);


router.post(
  "/departments/:departmentId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "create"),
  createDepartmentOffering
);
router.get(
  "/departments/:departmentId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "read"),
  getAllDepartmentOfferings
);
router.put(
  "/departments/:departmentId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "update"),
  updateDepartmentOffering
);
router.delete(
  "/departments/:departmentId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("ministry", "delete"),
  deleteDepartmentOffering
);


router.get(
  "/departments/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin"),
  requirePermission("ministry", "read"),
  getMinistryKPI
);

export default router
