import express from "express";
const router = express.Router();
import { createWelfareContribution, getAllWelfareContribution, updateWelfareContribution, deleteWelfareContribution} from "../../controller/financeController/welfareController/welfareContributionController.js";
import { createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement} from "../../controller/financeController/welfareController/welfareDisbursementController.js";
import getWelfareKPI from "../../controller/financeController/welfareController/welfareKPIController.js"

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/create-welfare-contributions", protect, authorizeRoles("superadmin", "churchadmin"), createWelfareContribution);
router.get("/get-welfare-contributions", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllWelfareContribution);
router.put("/update-welfare-contributions/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateWelfareContribution);
router.delete("/delete-welfare-contributions/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteWelfareContribution);


router.post("/create-welfare-disbursement", protect, authorizeRoles("superadmin", "churchadmin"), createWelfareDisbursement);
router.get("/get-welfare-disbursement", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllWelfareDisbursement);
router.put("/update-welfare-disbursement/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateWelfareDisbursement);
router.delete("/delete-welfare-disbursement/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteWelfareDisbursement);


router.get("/get-welfare-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getWelfareKPI);


export default router
