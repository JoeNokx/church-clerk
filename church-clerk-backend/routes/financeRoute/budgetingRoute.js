import express from "express";
const router = express.Router();

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

import {
  createBudget,
  deleteBudget,
  getBudget,
  getBudgetSummary,
  listBudgets,
  updateBudget
} from "../../controller/financeController/budgetingController.js";

router.post(
  "/budgets",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("budgeting", "create"),
  createBudget
);

router.get(
  "/budgets",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("budgeting", "read"),
  listBudgets
);

router.get(
  "/budgets/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("budgeting", "read"),
  getBudget
);

router.get(
  "/budgets/:id/summary",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("budgeting", "read"),
  getBudgetSummary
);

router.put(
  "/budgets/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("budgeting", "update"),
  updateBudget
);

router.delete(
  "/budgets/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("budgeting", "delete"),
  deleteBudget
);

export default router;
