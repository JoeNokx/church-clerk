import express from "express";
const router = express.Router();
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { searchMembersForTithe, createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI } from "../../controller/financeController/tithes/titheIndividualController.js";
import { createTitheAggregate, getAllTitheAggregates, updateTitheAggregate, deleteTitheAggregate, getTitheAggregateKPI } from "../../controller/financeController/tithes/titheAggregateController.js";

router.get("/members/search", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), searchMembersForTithe);

//individual
router.post("/tithe-individuals", protect, authorizeRoles("superadmin", "churchadmin"), createTitheIndividual);
router.get("/tithe-individuals", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllTitheIndividual);
router.put("/tithe-individuals/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateTitheIndividual);
router.delete("/tithe-individuals/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteTitheIndividual);
router.get("/tithe-individuals/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getTitheIndividualKPI);

//aggregate
router.post("/tithe-aggregates", protect, authorizeRoles("superadmin", "churchadmin"), createTitheAggregate);
router.get("/tithe-aggregates", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllTitheAggregates);
router.put("/tithe-aggregates/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateTitheAggregate);
router.delete("/tithe-aggregates/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteTitheAggregate);
router.get("/tithe-aggregates/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getTitheAggregateKPI);

export default router
