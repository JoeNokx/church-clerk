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

router.post(
  "/church-projects",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "create"),
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
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "update"),
  updateChurchProjects
);
router.delete(
  "/church-projects/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "delete"),
  deleteChurchProjects
);

router.post(
  "/church-projects/:projectId/contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "create"),
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
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "update"),
  updateProjectContributions
);
router.delete(
  "/church-projects/:projectId/contributions/:contributionId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "delete"),
  deleteProjectContributions
);

router.post(
  "/church-projects/:projectId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "create"),
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
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "update"),
  updateProjectExpenses
);
router.delete(
  "/church-projects/:projectId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("churchProjects", "delete"),
  deleteProjectExpenses
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
