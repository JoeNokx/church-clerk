import express from "express";
const router = express.Router();
import { createWelfareContribution, getAllWelfareContribution, updateWelfareContribution, deleteWelfareContribution, searchMembersForWelfare} from "../../controller/financeController/welfareController/welfareContributionController.js";
import { createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement} from "../../controller/financeController/welfareController/welfareDisbursementController.js";
import getWelfareKPI from "../../controller/financeController/welfareController/welfareKPIController.js"

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

router.get(
  "/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  searchMembersForWelfare
);

router.post(
  "/welfare-contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("welfare", "create"),
  createWelfareContribution
);
router.get(
  "/welfare-contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  getAllWelfareContribution
);
router.put(
  "/welfare-contributions/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("welfare", "update"),
  updateWelfareContribution
);
router.delete(
  "/welfare-contributions/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("welfare", "delete"),
  deleteWelfareContribution
);


router.post(
  "/welfare-disbursements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("welfare", "create"),
  createWelfareDisbursement
);
router.get(
  "/welfare-disbursements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  getAllWelfareDisbursement
);
router.put(
  "/welfare-disbursements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("welfare", "update"),
  updateWelfareDisbursement
);
router.delete(
  "/welfare-disbursements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("welfare", "delete"),
  deleteWelfareDisbursement
);


router.get(
  "/welfare/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("welfare", "read"),
  getWelfareKPI
);


export default router
