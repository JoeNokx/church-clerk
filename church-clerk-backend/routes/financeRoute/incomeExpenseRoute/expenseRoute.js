import express from "express";
const router = express.Router();
import {createExpense, getAllExpenses, getSingleExpense, updateExpense, deleteExpense} from "../../../controller/financeController/incomeExpenseController/expenseController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";

router.post("/create-expense", protect, authorizeRoles("superadmin", "admin"), createExpense);
router.get("/get-expenses", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllExpenses);
router.get("/get-expense/:id", protect, authorizeRoles("superadmin", "admin"), getSingleExpense); 
router.put("/update-expense/:id", protect, authorizeRoles("superadmin", "admin"), updateExpense);
router.delete("/delete-expense/:id", protect, authorizeRoles("superadmin", "admin"), deleteExpense);


export default router
