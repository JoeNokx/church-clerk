import express from "express";
const router = express.Router();

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { attachBillingBanner } from "../middleware/expiryWarningMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

import {
  getAllOutreachEvents, getOutreachEventById, createOutreachEvent,
  updateOutreachEvent, deleteOutreachEvent, getOutreachKPI,
} from "../controller/outreachController/outreachEventController.js";

import {
  getAllProspects, getProspectsByEvent, getProspectById,
  checkDuplicate, createProspect, createProspectDirect, updateProspect,
  assignFollowUpWorker, convertToMember, markAsVisitor, deleteProspect,
} from "../controller/outreachController/outreachProspectController.js";

import {
  getAllFollowUps, getFollowUpsStats, getFollowUpsByEvent,
  getFollowUpsByProspect, createFollowUp, updateFollowUp, deleteFollowUp,
} from "../controller/outreachController/outreachFollowUpController.js";

import {
  getOutreachAnalytics, getTeamStats,
} from "../controller/outreachController/outreachAnalyticsController.js";

import {
  getTeams, getTeamById, createTeam, updateTeam, deleteTeam,
} from "../controller/outreachController/outreachTeamController.js";

const readRoles = ["superadmin", "supportadmin", "churchadmin", "secretary", "leader", "admin", "associateadmin", "financialofficer"];
const writeRoles = ["superadmin", "churchadmin", "secretary", "leader", "admin", "associateadmin"];
const deleteRoles = ["superadmin", "churchadmin", "admin", "associateadmin"];

const bm = [protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner];
const R = [...bm, authorizeRoles(...readRoles), requirePermission("outreach", "read")];
const W = [...bm, authorizeRoles(...writeRoles), requirePermission("outreach", "create")];
const U = [...bm, authorizeRoles(...writeRoles), requirePermission("outreach", "update")];
const D = [...bm, authorizeRoles(...deleteRoles), requirePermission("outreach", "delete")];

// ── Events ────────────────────────────────────────────────────────
router.get("/events/kpi", ...R, getOutreachKPI);
router.get("/events", ...R, getAllOutreachEvents);
router.get("/events/:id", ...R, getOutreachEventById);
router.post("/events", ...W, createOutreachEvent);
router.put("/events/:id", ...U, updateOutreachEvent);
router.delete("/events/:id", ...D, deleteOutreachEvent);

// ── Prospects (cross-event) ───────────────────────────────────────
router.get("/prospects/check-duplicate", ...R, checkDuplicate);
router.get("/prospects", ...R, getAllProspects);
router.post("/prospects", ...W, createProspectDirect);
router.get("/prospects/:prospectId", ...R, getProspectById);
router.put("/prospects/:prospectId", ...U, updateProspect);
router.delete("/prospects/:prospectId", ...D, deleteProspect);
router.post("/prospects/:prospectId/assign-worker", ...U, assignFollowUpWorker);
router.post("/prospects/:prospectId/convert-to-member", ...U, convertToMember);
router.post("/prospects/:prospectId/mark-as-visitor", ...U, markAsVisitor);

// ── Prospects (nested under events) ──────────────────────────────
router.get("/events/:eventId/prospects", ...R, getProspectsByEvent);
router.post("/events/:eventId/prospects", ...W, createProspect);
router.put("/events/:eventId/prospects/:prospectId", ...U, updateProspect);
router.delete("/events/:eventId/prospects/:prospectId", ...D, deleteProspect);

// ── Follow-ups ────────────────────────────────────────────────────
router.get("/follow-ups/stats", ...R, getFollowUpsStats);
router.get("/follow-ups", ...R, getAllFollowUps);
router.get("/events/:eventId/follow-ups", ...R, getFollowUpsByEvent);
router.get("/prospects/:prospectId/follow-ups", ...R, getFollowUpsByProspect);
router.post("/prospects/:prospectId/follow-ups", ...W, createFollowUp);
router.put("/follow-ups/:followUpId", ...U, updateFollowUp);
router.delete("/follow-ups/:followUpId", ...D, deleteFollowUp);

// ── Analytics ─────────────────────────────────────────────────────
router.get("/analytics", ...R, getOutreachAnalytics);
router.get("/teams/stats", ...R, getTeamStats);

// ── Outreach Teams ────────────────────────────────────────────────
router.get("/outreach-teams", ...R, getTeams);
router.get("/outreach-teams/:teamId", ...R, getTeamById);
router.post("/outreach-teams", ...W, createTeam);
router.put("/outreach-teams/:teamId", ...U, updateTeam);
router.delete("/outreach-teams/:teamId", ...D, deleteTeam);

export default router;
