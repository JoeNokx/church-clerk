import express from"express";
const router = express.Router();
import {createBusinessVentures, getAllBusinessVentures, getSingleBusinessVentures, updateBusinessVentures, deleteBusinessVentures, getAllBusinessKPI } from "../../controller/financeController/businessVenturesController/businessController.js"
import {createBusinessIncome, getAllBusinessIncome, updateBusinessIncome, deleteBusinessIncome} from "../../controller/financeController/businessVenturesController/businessIncomeController.js"
import {createBusinessExpenses, getAllBusinessExpenses, updateBusinessExpenses, deleteBusinessExpenses} from "../../controller/financeController/businessVenturesController/businessExpensesController.js"
import getIncomeExpensesKPI from "../../controller/financeController/businessVenturesController/businessIncomeExpensesKPI.js"

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.post(
  "/business-ventures",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "create"),
  createBusinessVentures
);
router.get(
  "/business-ventures",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "read"),
  getAllBusinessVentures
);
router.get(
  "/business-ventures/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "read"),
  getSingleBusinessVentures
); 
router.put(
  "/business-ventures/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "update"),
  updateBusinessVentures
);
router.delete(
  "/business-ventures/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "delete"),
  deleteBusinessVentures
);
router.get(
  "/business-ventures/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "read"),
  getAllBusinessKPI
);


router.post(
  "/business-ventures/:businessId/incomes",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "create"),
  createBusinessIncome
);
router.get(
  "/business-ventures/:businessId/incomes",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "read"),
  getAllBusinessIncome
);
router.put(
  "/business-ventures/:businessId/incomes/:incomeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "update"),
  updateBusinessIncome
);
router.delete(
  "/business-ventures/:businessId/incomes/:incomeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "delete"),
  deleteBusinessIncome
);

router.post(
  "/business-ventures/:businessId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "create"),
  createBusinessExpenses
);
router.get(
  "/business-ventures/:businessId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "read"),
  getAllBusinessExpenses
);
router.put(
  "/business-ventures/:businessId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "update"),
  updateBusinessExpenses
);
router.delete(
  "/business-ventures/:businessId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("businessVentures", "delete"),
  deleteBusinessExpenses
);

router.get(
  "/business-ventures/:businessId/income-expenses/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "read"),
  getIncomeExpensesKPI
);


export default router
