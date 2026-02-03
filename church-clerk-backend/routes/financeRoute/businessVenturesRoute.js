import express from"express";
const router = express.Router();
import {createBusinessVentures, getAllBusinessVentures, getSingleBusinessVentures, updateBusinessVentures, deleteBusinessVentures, getAllBusinessKPI } from "../../controller/financeController/businessVenturesController/businessController.js"
import {createBusinessIncome, getAllBusinessIncome, updateBusinessIncome, deleteBusinessIncome} from "../../controller/financeController/businessVenturesController/businessIncomeController.js"
import {createBusinessExpenses, getAllBusinessExpenses, updateBusinessExpenses, deleteBusinessExpenses} from "../../controller/financeController/businessVenturesController/businessExpensesController.js"
import getIncomeExpensesKPI from "../../controller/financeController/businessVenturesController/businessIncomeExpensesKPI.js"

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.post("/business-ventures", protect, authorizeRoles("superadmin", "churchadmin"), createBusinessVentures);
router.get("/business-ventures", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessVentures);
router.get("/business-ventures/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleBusinessVentures); 
router.put("/business-ventures/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateBusinessVentures);
router.delete("/business-ventures/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteBusinessVentures);
router.get("/business-ventures/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessKPI);


router.post("/business-ventures/:businessId/incomes", protect, authorizeRoles("superadmin", "churchadmin"), createBusinessIncome);
router.get("/business-ventures/:businessId/incomes", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessIncome);
router.put("/business-ventures/:businessId/incomes/:incomeId", protect, authorizeRoles("superadmin", "churchadmin"), updateBusinessIncome);
router.delete("/business-ventures/:businessId/incomes/:incomeId", protect, authorizeRoles("superadmin", "churchadmin"), deleteBusinessIncome);

router.post("/business-ventures/:businessId/expenses", protect, authorizeRoles("superadmin", "churchadmin"), createBusinessExpenses);
router.get("/business-ventures/:businessId/expenses", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessExpenses);
router.put("/business-ventures/:businessId/expenses/:expensesId", protect, authorizeRoles("superadmin", "churchadmin"), updateBusinessExpenses);
router.delete("/business-ventures/:businessId/expenses/:expensesId", protect, authorizeRoles("superadmin", "churchadmin"), deleteBusinessExpenses);

router.get("/business-ventures/:businessId/income-expenses/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getIncomeExpensesKPI);


export default router
