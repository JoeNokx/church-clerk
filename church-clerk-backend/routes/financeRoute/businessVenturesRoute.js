import express from"express";
const router = express.Router();
import {createBusinessVentures, getAllBusinessVentures, getSingleBusinessVentures, updateBusinessVentures, deleteBusinessVentures, getAllBusinessKPI } from "../../controller/financeController/businessVenturesController/businessController.js"
import {createBusinessIncome, getAllBusinessIncome, updateBusinessIncome, deleteBusinessIncome} from "../../controller/financeController/businessVenturesController/businessIncomeController.js"
import {createBusinessExpenses, getAllBusinessExpenses, updateBusinessExpenses, deleteBusinessExpenses} from "../../controller/financeController/businessVenturesController/businessExpensesController.js"
import getIncomeExpensesKPI from "../../controller/financeController/businessVenturesController/businessIncomeExpensesKPI.js"

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.post("/business-ventures", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createBusinessVentures);
router.get("/business-ventures", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessVentures);
router.get("/business-ventures/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getSingleBusinessVentures); 
router.put("/business-ventures/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateBusinessVentures);
router.delete("/business-ventures/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteBusinessVentures);
router.get("/business-ventures/stats/kpi", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessKPI);


router.post("/business-ventures/:businessId/incomes", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createBusinessIncome);
router.get("/business-ventures/:businessId/incomes", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessIncome);
router.put("/business-ventures/:businessId/incomes/:incomeId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateBusinessIncome);
router.delete("/business-ventures/:businessId/incomes/:incomeId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteBusinessIncome);

router.post("/business-ventures/:businessId/expenses", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createBusinessExpenses);
router.get("/business-ventures/:businessId/expenses", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessExpenses);
router.put("/business-ventures/:businessId/expenses/:expensesId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateBusinessExpenses);
router.delete("/business-ventures/:businessId/expenses/:expensesId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteBusinessExpenses);

router.get("/business-ventures/:businessId/income-expenses/kpi", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getIncomeExpensesKPI);


export default router
