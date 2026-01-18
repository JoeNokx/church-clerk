import express from "express";
const router = express.Router();

import {getAllGeneralExpenses, createGeneralExpenses, updateGeneralExpenses, deleteGeneralExpenses, getGeneralExpensesKPI } from "../../controller/generalExpensesController.js"
import { protect } from "../../middleware/authMiddleware.js";
import {setActiveChurch} from "../../middleware/activeChurchMiddleware.js";
import {attachBillingBanner} from "../../middleware/expiryWarningMiddleware.js";
import {readOnlyBranchGuard} from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";   


router.get("/get-general-expenses", protect, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllGeneralExpenses);
router.post("/create-general-expenses", protect, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin"), createGeneralExpenses);
router.put("/update-general-expenses/:id", protect, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin"), updateGeneralExpenses);
router.delete("/delete-general-expenses/:id", protect, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin"), deleteGeneralExpenses);
router.get("/get-general-expenses-kpi", protect, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getGeneralExpensesKPI);

export default router