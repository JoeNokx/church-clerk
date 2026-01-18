import express from "express"; 
const router = express.Router(); 
import {createSpecialFund, getAllSpecialFunds, updateSpecialFund, deleteSpecialFund, getSpecialFundKPI} from "../../controller/financeController/specialFundController.js"
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/create-special-funds", protect, authorizeRoles("superadmin", "churchadmin"), createSpecialFund);
router.get("/get-special-funds", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllSpecialFunds);
router.put("/update-special-funds/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateSpecialFund);
router.delete("/delete-special-funds/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteSpecialFund);
router.get("/get-special-funds-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getSpecialFundKPI);

export default router
