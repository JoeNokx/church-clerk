import express from "express";
const router = express.Router();
import {createOffering, getAllOfferings, updateOffering, deleteOffering, getOfferingKPI} from "../../controller/financeController/offeringController.js"
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/create-offerings", protect, authorizeRoles("superadmin", "churchadmin"), createOffering);
router.get("/get-offerings", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllOfferings);
router.put("/update-offerings/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateOffering);
router.delete("/delete-offerings/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteOffering);
router.get("/get-offerings-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getOfferingKPI);

export default router

