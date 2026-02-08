import express from "express";
const router = express.Router();
import {createOffering, getAllOfferings, updateOffering, deleteOffering, getOfferingKPI} from "../../controller/financeController/offeringController.js"
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/offerings", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createOffering);
router.get("/offerings", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllOfferings);
router.put("/offerings/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateOffering);
router.delete("/offerings/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteOffering);
router.get("/offerings/stats/kpi", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getOfferingKPI);

export default router
