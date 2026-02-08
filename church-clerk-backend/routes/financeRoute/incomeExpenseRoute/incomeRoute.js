import express from "express";
const router = express.Router();
import {createIncome, getAllIncomes, getSingleIncome, updateIncome, deleteIncome} from "../../../controller/financeController/incomeExpenseController/incomeController.js"
import { protect } from "../../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../../middleware/roleMiddleware.js";

router.post("/incomes", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), createIncome);
router.get("/incomes", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin", "financialofficer"), getAllIncomes);
router.get("/incomes/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), getSingleIncome); 
router.put("/incomes/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), updateIncome);
router.delete("/incomes/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "admin"), deleteIncome);


export default router
