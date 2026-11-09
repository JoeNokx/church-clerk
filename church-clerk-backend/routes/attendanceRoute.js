import express from "express";
const router = express.Router();
import {
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
} from "../controller/attendanceController.js"
import {
    getFollowUpsByVisitor, createVisitorFollowUp
} from "../controller/outreachController/outreachFollowUpController.js"
import {
  createVisitorLog,
  getAllVisitorLogs,
  getSingleVisitorLog,
  updateVisitorLog,
  deleteVisitorLog
} from "../controller/visitorLogController.js"
import {
  createServiceIndividualAttendance,
  getAllServiceIndividualAttendances,
  getSingleServiceIndividualAttendance,
  updateServiceIndividualAttendance,
  deleteServiceIndividualAttendance,
  getCheckInLinkStatus,
  generateCheckInLink,
  revokeCheckInLink,
  getQrCheckInStatus,
  generateQrCheckIn,
  revokeQrCheckIn,
  getAbsentees,
  getAbsenteeMissedServices
} from "../controller/serviceIndividualAttendanceController.js"
import authorizeRoles from "../middleware/roleMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { deletionGuard } from "../services/recordDependencyService.js";


router.post(
  "/visitors",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "create"),
  createVisitor
);
router.put(
  "/visitors/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "update"),
  updateVisitor
);
router.delete(
  "/visitors/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "delete"),
  deletionGuard("visitor"),
  deleteVisitor
);
router.get(
  "/visitors/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "view"),
  getSingleVisitor
);
router.get(
  "/visitors",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("visitors", "read"),
  getAllVisitors
);

// Visitor follow-ups — same engine as outreach follow-ups, subject = visitor
router.get(
  "/visitors/:visitorId/follow-ups",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("visitors", "view"),
  getFollowUpsByVisitor
);
router.post(
  "/visitors/:visitorId/follow-ups",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "update"),
  createVisitorFollowUp
);


// Visitors Logs
router.get(
  "/visitor-logs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("visitors", "read"),
  getAllVisitorLogs
);
router.post(
  "/visitor-logs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "create"),
  createVisitorLog
);
router.get(
  "/visitor-logs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("visitors", "read"),
  getSingleVisitorLog
);
router.put(
  "/visitor-logs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "update"),
  updateVisitorLog
);
router.delete(
  "/visitor-logs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("visitors", "delete"),
  deleteVisitorLog
);


// Absentees — members on a consecutive missed-services streak
router.get(
  "/absentees",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("attendance", "read"),
  getAbsentees
);
router.get(
  "/absentees/:memberId/missed-services",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("attendance", "read"),
  getAbsenteeMissedServices
);

// Service Individual Attendance
router.get(
  "/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("attendance", "read"),
  getAllServiceIndividualAttendances
);
router.post(
  "/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "create"),
  createServiceIndividualAttendance
);
router.get(
  "/individual-attendances/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("attendance", "read"),
  getSingleServiceIndividualAttendance
);
router.put(
  "/individual-attendances/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  updateServiceIndividualAttendance
);
router.delete(
  "/individual-attendances/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "delete"),
  deletionGuard("serviceIndividualAttendance"),
  deleteServiceIndividualAttendance
);

router.get(
  "/checkin-link",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "read"),
  getCheckInLinkStatus
);
router.post(
  "/checkin-link/generate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  generateCheckInLink
);
router.delete(
  "/checkin-link/revoke",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  revokeCheckInLink
);
router.get(
  "/checkin-qr",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "read"),
  getQrCheckInStatus
);
router.post(
  "/checkin-qr/generate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  generateQrCheckIn
);
router.delete(
  "/checkin-qr/revoke",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  revokeQrCheckIn
);

export default router