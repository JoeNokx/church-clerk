import express from "express";
const router = express.Router();

import {getAllGeneralExpenses, createGeneralExpenses, updateGeneralExpenses, deleteGeneralExpenses, getGeneralExpensesKPI } from "../../controller/generalExpensesController.js"
import { protect } from "../../middleware/authMiddleware.js";
import {setActiveChurch} from "../../middleware/activeChurchMiddleware.js";
import {attachBillingBanner} from "../../middleware/expiryWarningMiddleware.js";
import {readOnlyBranchGuard} from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";   
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";

router.get("/general-expenses", protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllGeneralExpenses);
router.post("/general-expenses", protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin", "financialofficer"), createGeneralExpenses);
router.put("/general-expenses/:id", protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin", "financialofficer"), updateGeneralExpenses);
router.delete("/general-expenses/:id", protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin"), deleteGeneralExpenses);
router.get("/general-expenses/stats/kpi", protect, attachPermissions, setActiveChurch, readOnlyBranchGuard, attachBillingBanner, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getGeneralExpensesKPI);

export default router