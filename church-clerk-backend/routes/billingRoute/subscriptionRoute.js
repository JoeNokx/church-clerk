import express from "express";
// import { chargeWithPaystack } from "../controllers/billingController/paystackController.js";

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js"; 


import {
  chooseSubscription,
  upgradeTrialToPlan,
  runBillingCycle,
  getMySubscription
} from "../../controller/billingController/subscriptionController.js";

const router = express.Router();


// -----------------------------
// 1. Choose subscription (trial or plan) AFTER church registration
// -----------------------------
router.post(
  "/choose-subscription",
  protect, 
  authorizeRoles("superadmin", "churchadmin"),
  chooseSubscription
);

// -----------------------------
// 2. Upgrade trial to plan immediately
// -----------------------------
router.post(
  "/upgrade-trial",
  protect,
  authorizeRoles("superadmin", "churchadmin"),
  upgradeTrialToPlan
);

// -----------------------------
// 3. View subscription (for frontend banner etc)
// -----------------------------
router.get(
  "/my-subscription",
  protect,
  authorizeRoles("superadmin", "churchadmin"),
  getMySubscription
);

// -----------------------------
// 4. Run billing cycle (admin / cron)
// -----------------------------
router.post(
  "/run-billing-cycle",
  protect,
  authorizeRoles("superadmin"),
  runBillingCycle
);



// Paystack webhook
// router.post("/paystack", express.raw({ type: "application/json" }), chargeWithPaystack);



export default router;
