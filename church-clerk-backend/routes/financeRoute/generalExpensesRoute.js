import express from "express";
const router = express.Router();

import {getAllGeneralExpenses, createGeneralExpenses, updateGeneralExpenses, deleteGeneralExpenses, getGeneralExpensesKPI } from "../../controller/generalExpensesController.js"
import { protect } from "../../middleware/authMiddleware.js";
import {setActiveChurch} from "../../middleware/activeChurchMiddleware.js";
import {attachBillingBanner} from "../../middleware/expiryWarningMiddleware.js";
import {readOnlyBranchGuard} from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";   
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import GeneralExpenses from "../../models/generalExpenseModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";

router.get(
  "/general-expenses",
  protect,
  attachPermissions,
  setActiveChurch,
  readOnlyBranchGuard,
  attachBillingBanner,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "read"),
  getAllGeneralExpenses
);

router.post(
  "/general-expenses",
  protect,
  attachPermissions,
  setActiveChurch,
  readOnlyBranchGuard,
  attachBillingBanner,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "create"),
  backdatingGuard({ dateField: "date", module: "expenses", entityType: "generalExpense" }),
  createGeneralExpenses
);
router.put(
  "/general-expenses/:id",
  protect,
  attachPermissions,
  setActiveChurch,
  readOnlyBranchGuard,
  attachBillingBanner,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "update"),
  conditionalImmutableGuard(),
  updateGeneralExpenses
);
router.delete(
  "/general-expenses/:id",
  protect,
  attachPermissions,
  setActiveChurch,
  readOnlyBranchGuard,
  attachBillingBanner,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("expenses", "delete"),
  conditionalImmutableGuard(),
  deleteGeneralExpenses
);
router.get(
  "/general-expenses/stats/kpi",
  protect,
  attachPermissions,
  setActiveChurch,
  readOnlyBranchGuard,
  attachBillingBanner,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "read"),
  getGeneralExpensesKPI
);

router.post(
  "/general-expenses/:id/adjustments",
  protect,
  attachPermissions,
  setActiveChurch,
  readOnlyBranchGuard,
  attachBillingBanner,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("expenses", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await GeneralExpenses.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "General expense not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "expenses",
        entityType: "generalExpense",
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