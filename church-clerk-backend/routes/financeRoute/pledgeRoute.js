import express from "express";
const router = express.Router();
import {createPledge, getAllPledge, getSinglePledge, updatePledge, deletePledge } from "../../controller/financeController/pledgeController/pledgeController.js";
import  {createPledgePayment, getAllPledgePayments, updatePledgePayment, deletePledgePayment} from "../../controller/financeController/pledgeController/pledgePaymentController.js" 
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";


router.post(
  "/pledges",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "create"),
  createPledge
);
router.get(
  "/pledges",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "read"),
  getAllPledge
);
router.get(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "read"),
  getSinglePledge
); 
router.put(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "update"),
  updatePledge
);
router.delete(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "delete"),
  deletePledge
);


router.post(
  "/pledges/:pledgeId/payments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "create"),
  createPledgePayment
);
router.get(
  "/pledges/:pledgeId/payments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("pledges", "read"),
  getAllPledgePayments
);
router.put(
  "/pledges/:pledgeId/payments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "update"),
  updatePledgePayment
);
router.delete(
  "/pledges/:pledgeId/payments/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("pledges", "delete"),
  deletePledgePayment
);

export default router
