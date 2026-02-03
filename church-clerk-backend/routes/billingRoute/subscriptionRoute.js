import express from "express";
// import { chargeWithPaystack } from "../controllers/billingController/paystackController.js";

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js"; 
import { initializePaystackPayment } from "../../controller/billingController/paystackController.js";
import { paystackWebhook } from "../../controller/billingController/webhookController.js";

import {
  chooseSubscription,
  upgradeTrialToPlan,
  getMySubscription,
  getAvailablePlans
} from "../../controller/billingController/subscriptionController.js";

const router = express.Router();


// -----------------------------
// 1. Choose subscription (trial or plan) AFTER church registration
// -----------------------------
router.post(
  "/subscriptions",
  protect, 
  authorizeRoles("churchadmin"),
  chooseSubscription
);

// -----------------------------
// 2. Upgrade trial to plan immediately
// -----------------------------
router.post(
  "/subscriptions/upgrade",
  protect,
  authorizeRoles("churchadmin"),
  upgradeTrialToPlan
);

// -----------------------------
// 3. View subscription (for frontend banner etc)
// -----------------------------
router.get(
  "/subscriptions/me",
  protect,
  authorizeRoles("churchadmin"),
  getMySubscription
);

router.get(
  "/plans",
  protect,
  authorizeRoles("churchadmin"),
  getAvailablePlans
);

router.post(
  "/payments/paystack/initialize",
  protect,
  authorizeRoles("churchadmin"),
  initializePaystackPayment
);

router.post("/webhooks/paystack", paystackWebhook);


// Paystack webhook
// router.post("/paystack", express.raw({ type: "application/json" }), chargeWithPaystack);

export default router;
