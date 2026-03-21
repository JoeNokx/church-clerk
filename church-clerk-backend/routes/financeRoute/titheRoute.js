import express from "express";
const router = express.Router();
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { searchMembersForTithe, createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI } from "../../controller/financeController/tithes/titheIndividualController.js";
import { createTitheAggregate, getAllTitheAggregates, updateTitheAggregate, deleteTitheAggregate, getTitheAggregateKPI } from "../../controller/financeController/tithes/titheAggregateController.js";

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

//aggregate
router.post(
  "/tithe-aggregates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("tithe", "create"),
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

export default router
