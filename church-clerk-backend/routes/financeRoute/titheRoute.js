import express from "express";
const router = express.Router();
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createTitheAggregateSchema, createTitheIndividualSchema } from "../../validators/donations.js";
import { searchMembersForTithe, createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI } from "../../controller/financeController/tithes/titheIndividualController.js";
import { createTitheAggregate, getAllTitheAggregates, updateTitheAggregate, deleteTitheAggregate, getTitheAggregateKPI } from "../../controller/financeController/tithes/titheAggregateController.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import TitheIndividual from "../../models/financeModel/tithesModel/titheIndividualModel.js";
import TitheAggregate from "../../models/financeModel/tithesModel/titheAggregateModel.js";
import { createAdjustment } from "../../services/finance/governanceService.js";

router.get(
  "/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "read"),
  searchMembersForTithe
);

//individual
router.post(
  "/tithe-individuals",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "create"),
  validateRequest(createTitheIndividualSchema),
  backdatingGuard({ dateField: "date", module: "tithes", entityType: "titheIndividual" }),
  createTitheIndividual
);
router.get(
  "/tithe-individuals",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "read"),
  getAllTitheIndividual
);
router.put(
  "/tithe-individuals/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "update"),
  conditionalImmutableGuard(),
  updateTitheIndividual
);
router.delete(
  "/tithe-individuals/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "delete"),
  conditionalImmutableGuard(),
  deleteTitheIndividual
);
router.get(
  "/tithe-individuals/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "read"),
  getTitheIndividualKPI
);

router.post(
  "/tithe-individuals/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await TitheIndividual.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "Tithe individual not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "tithes",
        entityType: "titheIndividual",
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

//aggregate
router.post(
  "/tithe-aggregates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "create"),
  validateRequest(createTitheAggregateSchema),
  backdatingGuard({ dateField: "date", module: "tithes", entityType: "titheAggregate" }),
  createTitheAggregate
);
router.get(
  "/tithe-aggregates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "read"),
  getAllTitheAggregates
);
router.put(
  "/tithe-aggregates/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "update"),
  conditionalImmutableGuard(),
  updateTitheAggregate
);
router.delete(
  "/tithe-aggregates/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "delete"),
  conditionalImmutableGuard(),
  deleteTitheAggregate
);
router.get(
  "/tithe-aggregates/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "read"),
  getTitheAggregateKPI
);

router.post(
  "/tithe-aggregates/:id/adjustments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("tithe", "update"),
  async (req, res) => {
    try {
      const churchId = req.activeChurch?._id;
      if (!churchId) {
        return res.status(400).json({ message: "Active church is required" });
      }
      const original = await TitheAggregate.findOne({ _id: req.params.id, church: churchId });
      if (!original) {
        return res.status(404).json({ message: "Tithe aggregate not found" });
      }
      const { patch, reason, impactLevel } = req.body || {};
      const result = await createAdjustment({
        user: req.user,
        churchId,
        module: "tithes",
        entityType: "titheAggregate",
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
