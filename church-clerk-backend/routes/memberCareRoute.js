import express from "express";
const router = express.Router();

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { attachBillingBanner } from "../middleware/expiryWarningMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { deletionGuard } from "../services/recordDependencyService.js";

import {
  searchMembersForCare,
  getAllCareCases,
  getCareCaseById,
  createCareCase,
  updateCareCase,
  deleteCareCase
} from "../controller/memberCareController/careCaseController.js";

import {
  getAllCareVisits,
  getVisitsByCase,
  createCareVisit,
  updateCareVisit,
  deleteCareVisit
} from "../controller/memberCareController/careVisitController.js";

import {
  getAllPrayerRequests,
  createPrayerRequest,
  updatePrayerRequest,
  deletePrayerRequest
} from "../controller/memberCareController/prayerRequestController.js";

import getMemberCareKPI from "../controller/memberCareController/memberCareKPIController.js";

import {
  createCareCaseSchema,
  createCareVisitSchema,
  createPrayerRequestSchema
} from "../validators/memberCare.js";

const readRoles = ["superadmin", "supportadmin", "churchclerkadmin"];
const writeRoles = ["superadmin", "churchclerkadmin"];
const deleteRoles = ["superadmin", "churchclerkadmin"];

const bm = [protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner];
const R = [...bm, authorizeRoles(...readRoles), requirePermission("memberCare", "read")];
const W = [...bm, authorizeRoles(...writeRoles), requirePermission("memberCare", "create")];
const U = [...bm, authorizeRoles(...writeRoles), requirePermission("memberCare", "update")];
const D = [...bm, authorizeRoles(...deleteRoles), requirePermission("memberCare", "delete")];

// ── Members search (pickers) ──────────────────────────────────────
router.get("/members/search", ...R, searchMembersForCare);

// ── KPI ────────────────────────────────────────────────────────────
router.get("/stats/kpi", ...R, getMemberCareKPI);

// ── Care cases ─────────────────────────────────────────────────────
router.get("/cases", ...R, getAllCareCases);
router.post("/cases", ...W, validateRequest(createCareCaseSchema), createCareCase);
router.get("/cases/:caseId", ...R, getCareCaseById);
router.put("/cases/:caseId", ...U, updateCareCase);
router.delete("/cases/:caseId", ...D, deletionGuard("careCase", "caseId"), deleteCareCase);

// ── Care visits (nested under cases + cross-case list) ─────────────
router.get("/cases/:caseId/visits", ...R, getVisitsByCase);
router.post("/cases/:caseId/visits", ...W, validateRequest(createCareVisitSchema), createCareVisit);
router.get("/visits", ...R, getAllCareVisits);
router.put("/visits/:visitId", ...U, updateCareVisit);
router.delete("/visits/:visitId", ...D, deleteCareVisit);

// ── Prayer requests ────────────────────────────────────────────────
router.get("/prayer-requests", ...R, getAllPrayerRequests);
router.post("/prayer-requests", ...W, validateRequest(createPrayerRequestSchema), createPrayerRequest);
router.put("/prayer-requests/:requestId", ...U, updatePrayerRequest);
router.delete("/prayer-requests/:requestId", ...D, deletePrayerRequest);

export default router;
