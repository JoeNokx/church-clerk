import express from "express";
const router = express.Router();
import {createIncome, getAllIncomes, getSingleIncome, updateIncome, deleteIncome} from "../../../controller/financeController/incomeExpenseController/incomeController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";

router.post("/incomes", protect, authorizeRoles("superadmin", "admin"), createIncome);
router.get("/incomes", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllIncomes);
router.get("/incomes/:id", protect, authorizeRoles("superadmin", "admin"), getSingleIncome); 
router.put("/incomes/:id", protect, authorizeRoles("superadmin", "admin"), updateIncome);
router.delete("/incomes/:id", protect, authorizeRoles("superadmin", "admin"), deleteIncome);


export default router
