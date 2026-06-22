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
import BusinessVentures from "../../models/financeModel/businessModel/businessVenturesModel.js";
import BusinessIncome from "../../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessExpenses from "../../models/financeModel/businessModel/businessExpensesModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";


router.post(
  "/business-ventures",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "create"),
  backdatingGuard({ dateField: "startDate", module: "business", entityType: "businessVenture" }),
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
  requirePermission("businessVentures", "view"),
  getSingleBusinessVentures
); 
router.put(
  "/business-ventures/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "update"),
  conditionalImmutableGuard(),
  updateBusinessVentures
);
router.delete(
  "/business-ventures/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "delete"),
  conditionalImmutableGuard(),
  deleteBusinessVentures
);

router.post(
  "/business-ventures/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await BusinessVentures.findOne({ _id: req.params.id, church: churchId });
      if (!original) return res.status(404).json({ message: "Business venture not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "business",
        entityType: "businessVenture",
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
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "create"),
  backdatingGuard({ dateField: "date", module: "business", entityType: "businessIncome" }),
  createBusinessIncome
);
router.get(
  "/business-ventures/:businessId/incomes",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "view"),
  getAllBusinessIncome
);
router.put(
  "/business-ventures/:businessId/incomes/:incomeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "update"),
  conditionalImmutableGuard(),
  updateBusinessIncome
);
router.delete(
  "/business-ventures/:businessId/incomes/:incomeId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "delete"),
  conditionalImmutableGuard(),
  deleteBusinessIncome
);

router.post(
  "/business-ventures/:businessId/incomes/:incomeId/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await BusinessIncome.findOne({ _id: req.params.incomeId, church: churchId, businessVentures: req.params.businessId });
      if (!original) return res.status(404).json({ message: "Business income not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "business",
        entityType: "businessIncome",
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
  "/business-ventures/:businessId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "create"),
  backdatingGuard({ dateField: "date", module: "business", entityType: "businessExpense" }),
  createBusinessExpenses
);
router.get(
  "/business-ventures/:businessId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "view"),
  getAllBusinessExpenses
);
router.put(
  "/business-ventures/:businessId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "update"),
  conditionalImmutableGuard(),
  updateBusinessExpenses
);
router.delete(
  "/business-ventures/:businessId/expenses/:expensesId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("businessVentures", "delete"),
  conditionalImmutableGuard(),
  deleteBusinessExpenses
);

router.post(
  "/business-ventures/:businessId/expenses/:expensesId/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await BusinessExpenses.findOne({ _id: req.params.expensesId, church: churchId, businessVentures: req.params.businessId });
      if (!original) return res.status(404).json({ message: "Business expense not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "business",
        entityType: "businessExpense",
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
  "/business-ventures/:businessId/income-expenses/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("businessVentures", "view"),
  getIncomeExpensesKPI
);


export default router
