import express from "express";
const router = express.Router();
import {getPrograms, getProgramStats, getUpcomingPrograms, getOngoingPrograms, getPastPrograms} from "../controller/programController/getAllPrograms.js"

import createProgram from "../controller/programController/createProgram.js"
import getSingleProgram from "../controller/programController/getSingleProgram.js"
import updateProgram from "../controller/programController/updateProgram.js"
import deleteProgram from "../controller/programController/deleteProgram.js"

import {createProgramAttendee, getProgramAttendees, updateProgramAttendee, deleteProgramAttendee, advanceRegLink, advanceRegQr, checkInLink, checkInQr, ensureGuestVisitor, searchProgramGuests} from "../controller/programController/programAttendee.js"


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

import { createScopedExpense, getScopedExpenses, updateScopedExpense, deleteScopedExpense, downloadScopedExpenseReceipt } from "../controller/scopedExpensesController.js";

import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";
import { uploadReceiptFile } from "../middleware/uploadReceiptFile.js";
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
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getPrograms
);
router.get(
  "/programs/stats",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getProgramStats
);

router.get(
  "/programs/upcoming",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getUpcomingPrograms
);
router.get(
  "/programs/ongoing",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getOngoingPrograms
);
router.get(
  "/programs/past",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getPastPrograms
);

router.get(
  "/programs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getSingleProgram
);
router.post(
  "/programs",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "create"),
  createProgram
);
router.put(
  "/programs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "update"),
  updateProgram
);
router.delete(
  "/programs/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
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
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "create"),
  createProgramAttendee
);
router.get(
  "/programs/:programId/attendees",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getProgramAttendees
);
router.put(
  "/programs/:programId/attendees/:attendeeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "update"),
  updateProgramAttendee
);
router.delete(
  "/programs/:programId/attendees/:attendeeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "delete"),
  deleteProgramAttendee
);

router.get("/programs/:programId/advance-registration/link", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "read"), advanceRegLink.status);
router.post("/programs/:programId/advance-registration/link/generate", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), advanceRegLink.generate);
router.delete("/programs/:programId/advance-registration/link/revoke", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), advanceRegLink.revoke);

router.get("/programs/:programId/advance-registration/qr", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "read"), advanceRegQr.status);
router.post("/programs/:programId/advance-registration/qr/generate", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), advanceRegQr.generate);
router.delete("/programs/:programId/advance-registration/qr/revoke", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), advanceRegQr.revoke);
router.get("/program-guests/search", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("visitors", "read"), searchProgramGuests);

router.post("/programs/:programId/attendees/:attendeeId/ensure-visitor", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), ensureGuestVisitor);

router.get("/programs/:programId/check-in/link", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "read"), checkInLink.status);
router.post("/programs/:programId/check-in/link/generate", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), checkInLink.generate);
router.delete("/programs/:programId/check-in/link/revoke", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), checkInLink.revoke);

router.get("/programs/:programId/check-in/qr", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "read"), checkInQr.status);
router.post("/programs/:programId/check-in/qr/generate", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), checkInQr.generate);
router.delete("/programs/:programId/check-in/qr/revoke", protect, setActiveChurch, readOnlyBranchGuard, attachPermissions, authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"), requirePermission("programs", "update"), checkInQr.revoke);


router.post(
  "/programs/:programId/attendance-files",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
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
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  listProgramAttendanceFiles
);

router.get(
  "/programs/:programId/attendance-files/:fileId/download",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  downloadProgramAttendanceFile
);

router.put(
  "/programs/:programId/attendance-files/:fileId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "update"),
  updateProgramAttendanceFile
);

router.delete(
  "/programs/:programId/attendance-files/:fileId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "delete"),
  deleteProgramAttendanceFile
);

router.post(
  "/programs/:programId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
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
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getProgramOfferings
);

router.put(
  "/programs/:programId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
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
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "create"),
  uploadReceiptFile,
  backdatingGuard({ dateField: "date", module: "expenses", entityType: "generalExpense" }),
  createScopedExpense("program")
);
router.get(
  "/programs/:programId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  getScopedExpenses("program")
);
router.put(
  "/programs/:programId/expenses/:expenseId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "update"),
  uploadReceiptFile,
  conditionalImmutableGuard(),
  updateScopedExpense("program")
);
router.get(
  "/programs/:programId/expenses/:expenseId/receipt/download",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "read"),
  downloadScopedExpenseReceipt("program")
);
router.delete(
  "/programs/:programId/expenses/:expenseId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("programs", "delete"),
  conditionalImmutableGuard(),
  deleteScopedExpense("program")
);

export default router