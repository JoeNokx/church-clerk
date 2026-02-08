import express from "express";
const router = express.Router();
import {createExpense, getAllExpenses, getSingleExpense, updateExpense, deleteExpense} from "../../../controller/financeController/incomeExpenseController/expenseController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";

router.post("/expenses", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), createExpense);
router.get("/expenses", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin", "financialofficer"), getAllExpenses);
router.get("/expenses/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), getSingleExpense); 
router.put("/expenses/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), updateExpense);
router.delete("/expenses/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), deleteExpense);


export default router
