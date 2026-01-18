import express from"express";
const router = express.Router();
import {createBusinessVentures, getAllBusinessVentures, getSingleBusinessVentures, updateBusinessVentures, deleteBusinessVentures, getAllBusinessKPI } from "../../controller/financeController/businessVenturesController/businessController.js"
import {createBusinessIncome, getAllBusinessIncome, updateBusinessIncome, deleteBusinessIncome} from "../../controller/financeController/businessVenturesController/businessIncomeController.js"
import {createBusinessExpenses, getAllBusinessExpenses, updateBusinessExpenses, deleteBusinessExpenses} from "../../controller/financeController/businessVenturesController/businessExpensesController.js"
import getIncomeExpensesKPI from "../../controller/financeController/businessVenturesController/businessIncomeExpensesKPI.js"

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.post("/create-business-ventures", protect, authorizeRoles("superadmin", "churchadmin"), createBusinessVentures);
router.get("/get-business-ventures", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessVentures);
router.get("/get-business-ventures/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleBusinessVentures); 
router.put("/update-business-ventures/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateBusinessVentures);
router.delete("/delete-business-ventures/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteBusinessVentures);
router.get("/get-business-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessKPI);


router.post("/:businessId/add-business-income", protect, authorizeRoles("superadmin", "churchadmin"), createBusinessIncome);
router.get("/:businessId/get-business-income", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessIncome);
router.put("/:businessId/update-business-income/:incomeId", protect, authorizeRoles("superadmin", "churchadmin"), updateBusinessIncome);
router.delete("/:businessId/delete-business-income/:incomeId", protect, authorizeRoles("superadmin", "churchadmin"), deleteBusinessIncome);

router.post("/:businessId/add-business-expenses", protect, authorizeRoles("superadmin", "churchadmin"), createBusinessExpenses);
router.get("/:businessId/get-business-expenses", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllBusinessExpenses);
router.put("/:businessId/update-business-expenses/:expensesId", protect, authorizeRoles("superadmin", "churchadmin"), updateBusinessExpenses);
router.delete("/:businessId/delete-business-expenses/:expensesId", protect, authorizeRoles("superadmin", "churchadmin"), deleteBusinessExpenses);

router.get("/:businessId/get-income-expenses-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getIncomeExpensesKPI);




export default router
