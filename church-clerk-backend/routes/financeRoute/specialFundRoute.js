import express from "express"; 
const router = express.Router(); 
import {createSpecialFund, getAllSpecialFunds, updateSpecialFund, deleteSpecialFund, getSpecialFundKPI} from "../../controller/financeController/specialFundController.js"
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createSpecialFundSchema } from "../../validators/donations.js";
import SpecialFund from "../../models/financeModel/specialFundModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";

router.post(
  "/special-funds",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("specialFunds", "create"),
  validateRequest(createSpecialFundSchema),
  backdatingGuard({ dateField: "givingDate", module: "special_funds", entityType: "specialFund" }),
  createSpecialFund
);
router.get(
  "/special-funds",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("specialFunds", "read"),
  getAllSpecialFunds
);
router.put(
  "/special-funds/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("specialFunds", "update"),
  conditionalImmutableGuard(),
  updateSpecialFund
);
router.delete(
  "/special-funds/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("specialFunds", "delete"),
  conditionalImmutableGuard(),
  deleteSpecialFund
);
router.get(
  "/special-funds/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("specialFunds", "read"),
  getSpecialFundKPI
);

router.post(
  "/special-funds/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("specialFunds", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await SpecialFund.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "Special fund not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "special_funds",
        entityType: "specialFund",
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
