import express from "express";
const router = express.Router();
import {createOffering, getAllOfferings, updateOffering, deleteOffering, getOfferingKPI} from "../../controller/financeController/offeringController.js"
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/offerings", protect, authorizeRoles("superadmin", "churchadmin"), createOffering);
router.get("/offerings", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllOfferings);
router.put("/offerings/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateOffering);
router.delete("/offerings/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteOffering);
router.get("/offerings/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getOfferingKPI);

export default router
