import express from "express";
const router = express.Router();
import {getAllDepartments, getSingleDepartment, createDepartment, updateDepartment, deleteDepartment, addMemberToDepartment, searchMembersToAddToDepartment, getDepartmentMembers, updateDepartmentMemberRole, removeMemberFromDepartment, addDepartmentMeeting, updateDepartmentMeeting, deleteDepartmentMeeting, getDepartmentMeetings} from "../../controller/ministryController/departmentController.js"    
import { createDepartmentAttendance, updateDepartmentAttendance, deleteDepartmentAttendance, getAllDepartmentAttendances } from "../../controller/ministryController/departmentAttendanceController.js";
import { createDepartmentOffering, updateDepartmentOffering, deleteDepartmentOffering, getAllDepartmentOfferings } from "../../controller/ministryController/departmentOfferingController.js";
import { getMinistryKPI } from "../../controller/ministryController/groupController.js";
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/departments", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllDepartments);
router.get("/departments/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getSingleDepartment); 
router.post("/departments", protect, authorizeRoles("superadmin", "churchadmin", "admin"), createDepartment);
router.put("/departments/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateDepartment);
router.delete("/departments/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), deleteDepartment);


router.post("/departments/:id/members", protect, authorizeRoles("superadmin", "churchadmin", "admin"), addMemberToDepartment);
router.get("/departments/:id/members/search", protect, authorizeRoles("superadmin", "churchadmin", "admin"), searchMembersToAddToDepartment);
router.get("/departments/:id/members", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getDepartmentMembers);
router.put("/departments/:id/members/:memberId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateDepartmentMemberRole);
router.delete("/departments/:id/members/:memberId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), removeMemberFromDepartment);


router.post("/departments/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin", "admin"), addDepartmentMeeting);
router.get("/departments/:id/meetings", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getDepartmentMeetings);
router.put("/departments/:id/meetings/:meetingId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateDepartmentMeeting);
router.delete("/departments/:id/meetings/:meetingId", protect, authorizeRoles("superadmin", "churchadmin", "admin"), deleteDepartmentMeeting);


router.post("/departments/:departmentId/attendances", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), createDepartmentAttendance);
router.get("/departments/:departmentId/attendances", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllDepartmentAttendances);
router.put("/departments/:departmentId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), updateDepartmentAttendance);
router.delete("/departments/:departmentId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), deleteDepartmentAttendance);


router.post("/departments/:departmentId/offerings", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), createDepartmentOffering);
router.get("/departments/:departmentId/offerings", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllDepartmentOfferings);
router.put("/departments/:departmentId/offerings/:offeringId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), updateDepartmentOffering);
router.delete("/departments/:departmentId/offerings/:offeringId", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), deleteDepartmentOffering);


router.get("/departments/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getMinistryKPI);

export default router
