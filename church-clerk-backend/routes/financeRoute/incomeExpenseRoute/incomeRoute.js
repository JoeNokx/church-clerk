import express from "express";
const router = express.Router();
import {createIncome, getAllIncomes, getSingleIncome, updateIncome, deleteIncome} from "../../../controller/financeController/incomeExpenseController/incomeController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../../middleware/permissionMiddleware.js";
import Income from "../../../models/financeModel/incomeExpenseModel/incomeModel.js";
import { createAdjustment } from "../../../services/finance/governanceService.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../../middleware/financialGovernance.js";

router.post(
  "/incomes",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("expenses", "create"),
  backdatingGuard({ dateField: "dateReceived", module: "income", entityType: "income" }),
  createIncome
);
router.get(
  "/incomes",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "read"),
  getAllIncomes
);
router.get(
  "/incomes/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "read"),
  getSingleIncome
); 
router.put(
  "/incomes/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("expenses", "update"),
  conditionalImmutableGuard(),
  updateIncome
);
router.delete(
  "/incomes/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("expenses", "delete"),
  conditionalImmutableGuard(),
  deleteIncome
);

router.post(
  "/incomes/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await Income.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "Income not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "income",
        entityType: "income",
        original: original.toObject ? original.toObject() : original,
        patch,
        reason,
        impactLevel
      });
      if (result?.status === "PENDING_APPROVAL") {
        return res.status(202).json({ message: "Adjustment queued for approval", ...result });
      }
      return res.json({ message: "Adjustment applied", ...result });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);


export default router
