import express from "express";
const router = express.Router();
import {getPrograms, getProgramStats, getUpcomingPrograms, getOngoingPrograms, getPastPrograms} from "../controller/programController/getAllPrograms.js"

import createProgram from "../controller/programController/createProgram.js"
import getSingleProgram from "../controller/programController/getSingleProgram.js"
import updateProgram from "../controller/programController/updateProgram.js"
import deleteProgram from "../controller/programController/deleteProgram.js"

import {createProgramAttendee, getProgramAttendees, updateProgramAttendee, deleteProgramAttendee} from "../controller/programController/programAttendee.js"

import {
    createTotalProgramAttendance,
    getAllTotalProgramAttendances,
    updateTotalProgramAttendance,
    deleteTotalProgramAttendance
} from "../controller/programController/totalProgramAttendance.js"

import {
  uploadProgramAttendanceFile,
  listProgramAttendanceFiles,
  updateProgramAttendanceFile,
  downloadProgramAttendanceFile,
  deleteProgramAttendanceFile
} from "../controller/programController/programAttendanceFiles.js";

import {
  createProgramOffering,
  getProgramOfferings,
  updateProgramOffering,
  deleteProgramOffering
} from "../controller/programController/programOfferingController.js";

import { createScopedExpense, getScopedExpenses, updateScopedExpense, deleteScopedExpense } from "../controller/scopedExpensesController.js";

import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";
import { backdatingGuard, conditionalImmutableGuard } from "../middleware/financialGovernance.js";

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { deletionGuard } from "../services/recordDependencyService.js";

const uploadAttendanceFile = (req, res, next) => {
  uploadMemoryFile.single("file")(req, res, (err) => {
    if (!err) return next();

    const code = err?.code;
    const message =
      code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum size is 50MB."
        : err?.message || "File upload failed";

    return res.status(400).json({ message, code });
  });
};

router.get(
  "/programs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "read"),
  getPrograms
);
router.get(
  "/programs/stats",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "read"),
  getProgramStats
);

router.get(
  "/programs/upcoming",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "read"),
  getUpcomingPrograms
);
router.get(
  "/programs/ongoing",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "read"),
  getOngoingPrograms
);
router.get(
  "/programs/past",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "read"),
  getPastPrograms
);

router.get(
  "/programs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  getSingleProgram
);
router.post(
  "/programs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "create"),
  createProgram
);
router.put(
  "/programs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "update"),
  updateProgram
);
router.delete(
  "/programs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "delete"),
  deletionGuard("program"),
  deleteProgram
);

router.post(
  "/programs/:programId/attendees",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "create"),
  createProgramAttendee
);
router.get(
  "/programs/:programId/attendees",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  getProgramAttendees
);
router.put(
  "/programs/:programId/attendees/:attendeeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "update"),
  updateProgramAttendee
);
router.delete(
  "/programs/:programId/attendees/:attendeeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "delete"),
  deleteProgramAttendee
);

router.post(
  "/programs/:programId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "create"),
  createTotalProgramAttendance
);
router.get(
  "/programs/:programId/attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  getAllTotalProgramAttendances
);
router.put(
  "/programs/:programId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "update"),
  updateTotalProgramAttendance
);
router.delete(
  "/programs/:programId/attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "delete"),
  deleteTotalProgramAttendance
);

router.post(
  "/programs/:programId/attendance-files",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "create"),
  uploadAttendanceFile,
  uploadProgramAttendanceFile
);

router.get(
  "/programs/:programId/attendance-files",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  listProgramAttendanceFiles
);

router.get(
  "/programs/:programId/attendance-files/:fileId/download",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  downloadProgramAttendanceFile
);

router.put(
  "/programs/:programId/attendance-files/:fileId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "update"),
  updateProgramAttendanceFile
);

router.delete(
  "/programs/:programId/attendance-files/:fileId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "delete"),
  deleteProgramAttendanceFile
);

router.post(
  "/programs/:programId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "create"),
  backdatingGuard({ dateField: "offeringDate", module: "programOffering", entityType: "programOffering" }),
  createProgramOffering
);

router.get(
  "/programs/:programId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  getProgramOfferings
);

router.put(
  "/programs/:programId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "update"),
  conditionalImmutableGuard(),
  updateProgramOffering
);

router.post(
  "/programs/:programId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "create"),
  backdatingGuard({ dateField: "date", module: "expenses", entityType: "generalExpense" }),
  createScopedExpense("program")
);
router.get(
  "/programs/:programId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "view"),
  getScopedExpenses("program")
);
router.put(
  "/programs/:programId/expenses/:expenseId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "update"),
  conditionalImmutableGuard(),
  updateScopedExpense("program")
);
router.delete(
  "/programs/:programId/expenses/:expenseId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("programs", "delete"),
  conditionalImmutableGuard(),
  deleteScopedExpense("program")
);

export default router