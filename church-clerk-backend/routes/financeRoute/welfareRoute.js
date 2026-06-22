import express from "express";
const router = express.Router();
import { createWelfareContribution, getAllWelfareContribution, updateWelfareContribution, deleteWelfareContribution, searchMembersForWelfare} from "../../controller/financeController/welfareController/welfareContributionController.js";
import { createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement} from "../../controller/financeController/welfareController/welfareDisbursementController.js";
import getWelfareKPI from "../../controller/financeController/welfareController/welfareKPIController.js"

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createWelfareContributionSchema, createWelfareDisbursementSchema } from "../../validators/donations.js";
import WelfareContributions from "../../models/financeModel/welfareModel/welfareContributionModel.js";
import WelfareDisbursements from "../../models/financeModel/welfareModel/welfareDisbursementModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";

router.get(
  "/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  searchMembersForWelfare
);

router.post(
  "/welfare-contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("welfare", "create"),
  validateRequest(createWelfareContributionSchema),
  backdatingGuard({ dateField: "date", module: "welfare", entityType: "welfareContribution" }),
  createWelfareContribution
);
router.get(
  "/welfare-contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  getAllWelfareContribution
);
router.put(
  "/welfare-contributions/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("welfare", "update"),
  conditionalImmutableGuard(),
  updateWelfareContribution
);
router.delete(
  "/welfare-contributions/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("welfare", "delete"),
  conditionalImmutableGuard(),
  deleteWelfareContribution
);

router.post(
  "/welfare-contributions/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await WelfareContributions.findOne({ _id: req.params.id, church: churchId });
      if (!original) return res.status(404).json({ message: "Welfare contribution not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "welfare",
        entityType: "welfareContribution",
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
  "/welfare-disbursements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("welfare", "create"),
  validateRequest(createWelfareDisbursementSchema),
  backdatingGuard({ dateField: "date", module: "welfare", entityType: "welfareDisbursement" }),
  createWelfareDisbursement
);
router.get(
  "/welfare-disbursements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  getAllWelfareDisbursement
);
router.put(
  "/welfare-disbursements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("welfare", "update"),
  conditionalImmutableGuard(),
  updateWelfareDisbursement
);
router.delete(
  "/welfare-disbursements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("welfare", "delete"),
  conditionalImmutableGuard(),
  deleteWelfareDisbursement
);

router.post(
  "/welfare-disbursements/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) return res.status(400).json({ message: "Active church is required" });
      const original = await WelfareDisbursements.findOne({ _id: req.params.id, church: churchId });
      if (!original) return res.status(404).json({ message: "Welfare disbursement not found" });
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "welfare",
        entityType: "welfareDisbursement",
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
  "/welfare/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  getWelfareKPI
);


export default router
