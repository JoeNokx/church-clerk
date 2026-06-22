import express from "express";
const router = express.Router();
import {createChurchProjects, getAllChurchProjects, updateChurchProjects, deleteChurchProjects, getSingleChurchProjects } from "../../controller/financeController/projectController/churchProjectController.js";
import  {createProjectContributions, getAllProjectContributions, updateProjectContributions, deleteProjectContributions } from "../../controller/financeController/projectController/projectContribution.js"
import{ createProjectExpenses, getAllProjectExpenses, updateProjectExpenses, deleteProjectExpenses } from "../../controller/financeController/projectController/projectExpense.js"
import getProjectContributionExpensesKPI from "../../controller/financeController/projectController/projectContributionExpensesKPI.js"


import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import ChurchProject from "../../models/financeModel/projectModel/churchProjectModel.js";
import ProjectContribution from "../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpense from "../../models/financeModel/projectModel/projectExpenseModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";

router.post(
  "/church-projects",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "create"),
  backdatingGuard({ dateField: "startDate", module: "projects", entityType: "churchProject" }),
  createChurchProjects
);
router.get(
  "/church-projects",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "read"),
  getAllChurchProjects
);

router.get(
  "/church-projects/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "view"),
  getSingleChurchProjects
);
router.put(
  "/church-projects/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "update"),
  conditionalImmutableGuard(),
  updateChurchProjects
);
router.delete(
  "/church-projects/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "delete"),
  conditionalImmutableGuard(),
  deleteChurchProjects
);

router.post(
  "/church-projects/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await ChurchProject.findOne({ _id: req.params.id, church: churchId });
      if (!original) return res.status(404).json({ message: "Church project not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "projects",
        entityType: "churchProject",
        original: original.toObject ? original.toObject() : original,
        patch,
        reason,
        impactLevel
      });
      if (result?.status === "PENDING_APPROVAL") return res.status(202).json({ message: "Adjustment queued for approval", ...result });
      return res.json({ message: "Adjustment applied", ...result });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/church-projects/:projectId/contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "create"),
  backdatingGuard({ dateField: "date", module: "projects", entityType: "projectContribution" }),
  createProjectContributions
);
router.get(
  "/church-projects/:projectId/contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "view"),
  getAllProjectContributions
);
router.put(
  "/church-projects/:projectId/contributions/:contributionId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "update"),
  conditionalImmutableGuard(),
  updateProjectContributions
);
router.delete(
  "/church-projects/:projectId/contributions/:contributionId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "delete"),
  conditionalImmutableGuard(),
  deleteProjectContributions
);

router.post(
  "/church-projects/:projectId/contributions/:contributionId/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await ProjectContribution.findOne({ _id: req.params.contributionId, church: churchId, churchProject: req.params.projectId });
      if (!original) return res.status(404).json({ message: "Project contribution not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "projects",
        entityType: "projectContribution",
        original: original.toObject ? original.toObject() : original,
        patch,
        reason,
        impactLevel
      });
      if (result?.status === "PENDING_APPROVAL") return res.status(202).json({ message: "Adjustment queued for approval", ...result });
      return res.json({ message: "Adjustment applied", ...result });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/church-projects/:projectId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "create"),
  backdatingGuard({ dateField: "date", module: "projects", entityType: "projectExpense" }),
  createProjectExpenses
);
router.get(
  "/church-projects/:projectId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "view"),
  getAllProjectExpenses
);
router.put(
  "/church-projects/:projectId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "update"),
  conditionalImmutableGuard(),
  updateProjectExpenses
);
router.delete(
  "/church-projects/:projectId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("churchProjects", "delete"),
  conditionalImmutableGuard(),
  deleteProjectExpenses
);

router.post(
  "/church-projects/:projectId/expenses/:expensesId/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await ProjectExpense.findOne({ _id: req.params.expensesId, church: churchId, churchProject: req.params.projectId });
      if (!original) return res.status(404).json({ message: "Project expense not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "projects",
        entityType: "projectExpense",
        original: original.toObject ? original.toObject() : original,
        patch,
        reason,
        impactLevel
      });
      if (result?.status === "PENDING_APPROVAL") return res.status(202).json({ message: "Adjustment queued for approval", ...result });
      return res.json({ message: "Adjustment applied", ...result });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);


router.get(
  "/church-projects/:projectId/contribution-expenses/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("churchProjects", "view"),
  getProjectContributionExpensesKPI
);




export default router
