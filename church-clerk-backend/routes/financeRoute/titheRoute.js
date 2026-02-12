import express from "express";
const router = express.Router();
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { searchMembersForTithe, createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI } from "../../controller/financeController/tithes/titheIndividualController.js";
import { createTitheAggregate, getAllTitheAggregates, updateTitheAggregate, deleteTitheAggregate, getTitheAggregateKPI } from "../../controller/financeController/tithes/titheAggregateController.js";

router.get(
  "/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  searchMembersForTithe
);

//individual
router.post("/tithe-individuals", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createTitheIndividual);
router.get("/tithe-individuals", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getAllTitheIndividual);
router.put("/tithe-individuals/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateTitheIndividual);
router.delete("/tithe-individuals/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteTitheIndividual);
router.get(
  "/tithe-individuals/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getTitheIndividualKPI
);

//aggregate
router.post("/tithe-aggregates", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createTitheAggregate);
router.get("/tithe-aggregates", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getAllTitheAggregates);
router.put("/tithe-aggregates/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateTitheAggregate);
router.delete("/tithe-aggregates/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteTitheAggregate);
router.get(
  "/tithe-aggregates/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getTitheAggregateKPI
);

export default router
