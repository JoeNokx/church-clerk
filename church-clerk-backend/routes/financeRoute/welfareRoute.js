import express from "express";
const router = express.Router();
import { createWelfareContribution, getAllWelfareContribution, updateWelfareContribution, deleteWelfareContribution} from "../../controller/financeController/welfareController/welfareContributionController.js";
import { createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement} from "../../controller/financeController/welfareController/welfareDisbursementController.js";
import getWelfareKPI from "../../controller/financeController/welfareController/welfareKPIController.js"

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/welfare-contributions", protect, authorizeRoles("superadmin", "churchadmin"), createWelfareContribution);
router.get("/welfare-contributions", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllWelfareContribution);
router.put("/welfare-contributions/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateWelfareContribution);
router.delete("/welfare-contributions/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteWelfareContribution);


router.post("/welfare-disbursements", protect, authorizeRoles("superadmin", "churchadmin"), createWelfareDisbursement);
router.get("/welfare-disbursements", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllWelfareDisbursement);
router.put("/welfare-disbursements/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateWelfareDisbursement);
router.delete("/welfare-disbursements/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteWelfareDisbursement);


router.get("/welfare/stats/kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getWelfareKPI);


export default router
