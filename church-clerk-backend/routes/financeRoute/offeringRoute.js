import express from "express";
const router = express.Router();
import {createOffering, getAllOfferings, updateOffering, deleteOffering, getOfferingKPI} from "../../controller/financeController/offeringController.js"
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createOfferingSchema } from "../../validators/donations.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import Offering from "../../models/financeModel/offeringModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";

router.post(
  "/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("offerings", "create"),
  validateRequest(createOfferingSchema),
  backdatingGuard({ dateField: "serviceDate", module: "offerings", entityType: "offering" }),
  createOffering
);
router.get(
  "/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("offerings", "read"),
  getAllOfferings
);
router.put(
  "/offerings/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("offerings", "update"),
  conditionalImmutableGuard(),
  updateOffering
);
router.delete(
  "/offerings/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("offerings", "delete"),
  conditionalImmutableGuard(),
  deleteOffering
);
router.get(
  "/offerings/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("offerings", "read"),
  getOfferingKPI
);

router.post(
  "/offerings/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("offerings", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await Offering.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "Offering not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "offerings",
        entityType: "offering",
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
