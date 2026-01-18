import express from "express";
const router = express.Router();
import {createPledge, getAllPledge, getSinglePledge, updatePledge, deletePledge } from "../../controller/financeController/pledgeController/pledgeController.js";
import  {createPledgePayment, getAllPledgePayments, updatePledgePayment, deletePledgePayment} from "../../controller/financeController/pledgeController/pledgePaymentController.js" 
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.post("/create-pledge", protect, authorizeRoles("superadmin", "churchadmin"), createPledge);
router.get("/get-pledge", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllPledge);
router.get("/get-pledge/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSinglePledge); 
router.put("/update-pledge/:id", protect, authorizeRoles("superadmin", "churchadmin"), updatePledge);
router.delete("/delete-pledge/:id", protect, authorizeRoles("superadmin", "churchadmin"), deletePledge);


router.post("/:pledgeId/create-pledge-payment", protect, authorizeRoles("superadmin", "churchadmin"), createPledgePayment);
router.get("/:pledgeId/get-pledge-payment", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllPledgePayments);
router.put("/:pledgeId/update-pledge-payment/:id", protect, authorizeRoles("superadmin", "churchadmin"), updatePledgePayment);
router.delete("/:pledgeId/delete-pledge-payment/:id", protect, authorizeRoles("superadmin", "churchadmin"), deletePledgePayment);

export default router
