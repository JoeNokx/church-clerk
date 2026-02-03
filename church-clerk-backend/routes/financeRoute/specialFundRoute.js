import express from "express"; 
const router = express.Router(); 
import {createSpecialFund, getAllSpecialFunds, updateSpecialFund, deleteSpecialFund, getSpecialFundKPI} from "../../controller/financeController/specialFundController.js"
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/special-funds", protect, setActiveChurch, authorizeRoles("superadmin", "churchadmin"), createSpecialFund);
router.get("/special-funds", protect, setActiveChurch, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllSpecialFunds);
router.put("/special-funds/:id", protect, setActiveChurch, authorizeRoles("superadmin", "churchadmin"), updateSpecialFund);
router.delete("/special-funds/:id", protect, setActiveChurch, authorizeRoles("superadmin", "churchadmin"), deleteSpecialFund);
router.get("/special-funds/stats/kpi", protect, setActiveChurch, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getSpecialFundKPI);

export default router
