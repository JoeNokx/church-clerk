import express from "express";
const router = express.Router();
import {createExpense, getAllExpenses, getSingleExpense, updateExpense, deleteExpense} from "../../../controller/financeController/incomeExpenseController/expenseController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../../middleware/permissionMiddleware.js";

router.post(
  "/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("expenses", "create"),
  createExpense
);
router.get(
  "/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "read"),
  getAllExpenses
);
router.get(
  "/expenses/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "read"),
  getSingleExpense
); 
router.put(
  "/expenses/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("expenses", "update"),
  updateExpense
);
router.delete(
  "/expenses/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("expenses", "delete"),
  deleteExpense
);


export default router
