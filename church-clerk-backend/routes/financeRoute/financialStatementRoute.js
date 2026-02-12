import express from "express";
const router = express.Router();
import {
  getAnnualFinancialStatement,
  getMonthlyFinancialStatement,
  getQuarterlyFinancialStatement,
  exportFinancialStatement
} from "../../controller/financeController/financialStatementController.js";
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get(
  "/financial-statements/annual",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getAnnualFinancialStatement
);
router.get(
  "/financial-statements/monthly",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getMonthlyFinancialStatement
);
router.get(
  "/financial-statements/quarterly",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getQuarterlyFinancialStatement
);
router.get(
  "/financial-statements/export",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  exportFinancialStatement
);

export default router
