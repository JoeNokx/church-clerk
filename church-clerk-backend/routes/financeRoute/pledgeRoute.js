import express from "express";
const router = express.Router();
import {createPledge, getAllPledge, getSinglePledge, updatePledge, deletePledge } from "../../controller/financeController/pledgeController/pledgeController.js";
import  {createPledgePayment, getAllPledgePayments, updatePledgePayment, deletePledgePayment} from "../../controller/financeController/pledgeController/pledgePaymentController.js" 
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.post("/pledges", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createPledge);
router.get(
  "/pledges",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getAllPledge
);
router.get(
  "/pledges/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getSinglePledge
); 
router.put("/pledges/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updatePledge);
router.delete("/pledges/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deletePledge);


router.post("/pledges/:pledgeId/payments", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createPledgePayment);
router.get(
  "/pledges/:pledgeId/payments",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getAllPledgePayments
);
router.put("/pledges/:pledgeId/payments/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updatePledgePayment);
router.delete("/pledges/:pledgeId/payments/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deletePledgePayment);

export default router
