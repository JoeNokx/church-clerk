import express from "express";
const router = express.Router();
import {getAllAttendances, createAttendance, updateAttendance, deleteAttendance,
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
} from "../controller/attendanceController.js"
import {
  createServiceIndividualAttendance,
  getAllServiceIndividualAttendances,
  getSingleServiceIndividualAttendance,
  updateServiceIndividualAttendance,
  deleteServiceIndividualAttendance,
  getCheckInLinkStatus,
  generateCheckInLink,
  revokeCheckInLink
} from "../controller/serviceIndividualAttendanceController.js"
import authorizeRoles from "../middleware/roleMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";


router.get(
  "/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("attendance", "read"),
  getAllAttendances
);
router.post(
  "/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "create"),
  createAttendance
);
router.put(
  "/attendances/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  updateAttendance
);
router.delete(
  "/attendances/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "delete"),
  deleteAttendance
);


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
  deleteServiceIndividualAttendance
);

router.get(
  "/individual-attendances/:id/checkin-link",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "read"),
  getCheckInLinkStatus
);
router.post(
  "/individual-attendances/:id/checkin-link/generate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  generateCheckInLink
);
router.delete(
  "/individual-attendances/:id/checkin-link/revoke",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("attendance", "update"),
  revokeCheckInLink
);

export default router