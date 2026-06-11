import express from "express";
const router = express.Router();
import {createPledge, getAllPledge, getSinglePledge, updatePledge, deletePledge } from "../../controller/financeController/pledgeController/pledgeController.js";
import  {createPledgePayment, getAllPledgePayments, updatePledgePayment, deletePledgePayment} from "../../controller/financeController/pledgeController/pledgePaymentController.js" 
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import Pledge from "../../models/financeModel/pledgeModel/pledgeModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";


router.post(
  "/pledges",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "create"),
  backdatingGuard({ dateField: "pledgeDate", module: "pledges", entityType: "pledge" }),
  createPledge
);
router.get(
  "/pledges",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "read"),
  getAllPledge
);
router.get(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "view"),
  getSinglePledge
); 
router.put(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "update"),
  conditionalImmutableGuard(),
  updatePledge
);
router.delete(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "delete"),
  conditionalImmutableGuard(),
  deletePledge
);

router.post(
  "/pledges/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await Pledge.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "Pledge not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "pledges",
        entityType: "pledge",
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


router.post(
  "/pledges/:pledgeId/payments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "create"),
  backdatingGuard({ dateField: "paymentDate", module: "pledges", entityType: "pledgePayment" }),
  createPledgePayment
);
router.get(
  "/pledges/:pledgeId/payments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "view"),
  getAllPledgePayments
);
router.put(
  "/pledges/:pledgeId/payments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "update"),
  conditionalImmutableGuard(),
  updatePledgePayment
);
router.delete(
  "/pledges/:pledgeId/payments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "delete"),
  conditionalImmutableGuard(),
  deletePledgePayment
);

router.post(
  "/pledges/:pledgeId/payments/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await PledgePayment.findOne({ _id: req.params.id, church: churchId, pledge: req.params.pledgeId });
      if (!original) {
        return res.status(404).json({ message: "Pledge payment not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "pledges",
        entityType: "pledgePayment",
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
