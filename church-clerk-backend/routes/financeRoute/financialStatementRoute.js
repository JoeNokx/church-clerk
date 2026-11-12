import express from "express";
const router = express.Router();
import {
  getAnnualFinancialStatement,
  getMonthlyFinancialStatement,
  getQuarterlyFinancialStatement,
  exportFinancialStatement,
  getStatementBreakdownDetails
} from "../../controller/financeController/financialStatementController.js";
import { getOpeningBalances, createOpeningBalance, updateOpeningBalance } from "../../controller/financeController/openingBalanceController.js";
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.get(
  "/financial-statements/annual",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "read"),
  getAnnualFinancialStatement
);
router.get(
  "/financial-statements/monthly",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "read"),
  getMonthlyFinancialStatement
);
router.get(
  "/financial-statements/quarterly",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "read"),
  getQuarterlyFinancialStatement
);
router.get(
  "/financial-statements/details",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "read"),
  getStatementBreakdownDetails
);
router.get(
  "/financial-statements/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "export"),
  exportFinancialStatement
);

router.get(
  "/opening-balance",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "read"),
  getOpeningBalances
);
router.post(
  "/opening-balance",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "create"),
  createOpeningBalance
);
router.put(
  "/opening-balance/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financialStatement", "update"),
  updateOpeningBalance
);

export default router
