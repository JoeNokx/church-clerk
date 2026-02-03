import express from "express";
const router = express.Router();
import {createExpense, getAllExpenses, getSingleExpense, updateExpense, deleteExpense} from "../../../controller/financeController/incomeExpenseController/expenseController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";

router.post("/expenses", protect, authorizeRoles("superadmin", "admin"), createExpense);
router.get("/expenses", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllExpenses);
router.get("/expenses/:id", protect, authorizeRoles("superadmin", "admin"), getSingleExpense); 
router.put("/expenses/:id", protect, authorizeRoles("superadmin", "admin"), updateExpense);
router.delete("/expenses/:id", protect, authorizeRoles("superadmin", "admin"), deleteExpense);


export default router
