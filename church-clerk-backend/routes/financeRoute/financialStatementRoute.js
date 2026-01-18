import express from "express";
const router = express.Router();
import { getAnnualFinancialStatement, getMonthlyFinancialStatement } from "../../controller/financeController/financialStatementController.js";
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/get-annual-financial-statement", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAnnualFinancialStatement);
router.get("/get-monthly-financial-statement", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getMonthlyFinancialStatement);

export default router

