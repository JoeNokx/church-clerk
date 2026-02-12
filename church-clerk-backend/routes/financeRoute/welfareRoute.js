import express from "express";
const router = express.Router();
import { createWelfareContribution, getAllWelfareContribution, updateWelfareContribution, deleteWelfareContribution, searchMembersForWelfare} from "../../controller/financeController/welfareController/welfareContributionController.js";
import { createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement} from "../../controller/financeController/welfareController/welfareDisbursementController.js";
import getWelfareKPI from "../../controller/financeController/welfareController/welfareKPIController.js"

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.get(
  "/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  searchMembersForWelfare
);

router.post("/welfare-contributions", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createWelfareContribution);
router.get(
  "/welfare-contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getAllWelfareContribution
);
router.put("/welfare-contributions/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateWelfareContribution);
router.delete("/welfare-contributions/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteWelfareContribution);


router.post("/welfare-disbursements", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createWelfareDisbursement);
router.get(
  "/welfare-disbursements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getAllWelfareDisbursement
);
router.put("/welfare-disbursements/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateWelfareDisbursement);
router.delete("/welfare-disbursements/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteWelfareDisbursement);


router.get(
  "/welfare/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getWelfareKPI
);


export default router
