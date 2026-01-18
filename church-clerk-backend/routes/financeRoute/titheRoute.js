import express from "express";
const router = express.Router();
import {createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI} from "../../controller/financeController/tithes/titheIndividualController.js"
import  {createTitheAggregate, getAllTitheAggregates, updateTitheAggregate, deleteTitheAggregate, getTitheAggregateKPI} from "../../controller/financeController/tithes/titheAggregateController.js"
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.post("/create-titheIndividuals", protect, authorizeRoles("superadmin", "churchadmin"), createTitheIndividual);
router.get("/get-titheIndividuals", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllTitheIndividual);
router.put("/update-titheIndividuals/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateTitheIndividual);
router.delete("/delete-titheIndividuals/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteTitheIndividual);
router.get("/get-titheIndividuals-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getTitheIndividualKPI);

router.post("/create-titheAggregates", protect, authorizeRoles("superadmin", "churchadmin"), createTitheAggregate);
router.get("/get-titheAggregates", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllTitheAggregates);
router.put("/update-titheAggregates/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateTitheAggregate);
router.delete("/delete-titheAggregates/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteTitheAggregate);
router.get("/get-titheAggregates-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getTitheAggregateKPI);

export default router
