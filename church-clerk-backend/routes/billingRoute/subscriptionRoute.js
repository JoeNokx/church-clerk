import express from "express";
// import { chargeWithPaystack } from "../controllers/billingController/paystackController.js";

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js"; 
import { chargePaystackMobileMoney, initializePaystackPayment, verifyPaystackPayment } from "../../controller/billingController/paystackController.js";
import { paystackWebhook } from "../../controller/billingController/webhookController.js";
import { cancelSubscription, changePlan } from "../../controller/billingController/cancelPauseResumeSubscriptionController.js";

import {
  chooseSubscription,
  upgradeTrialToPlan,
  getMySubscription,
  getAvailablePlans,
  getPublicPlans,
  downloadBillingInvoice,
  getMyBillingHistory,
  addMobileMoneyPaymentMethod,
  addCardPaymentMethod,
  removePaymentMethod
} from "../../controller/billingController/subscriptionController.js";

const router = express.Router();

const churchDashboardRoles = [
  "churchadmin",
  "associateadmin",
  "secretary",
  "financialofficer",
  "leader",
  "superadmin",
  "supportadmin"
];

router.get(
  "/public/plans",
  getPublicPlans
);


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
  authorizeRoles(...churchDashboardRoles),
  getMySubscription
);

router.get(
  "/plans",
  protect,
  authorizeRoles(...churchDashboardRoles),
  getAvailablePlans
);

router.post(
  "/payments/paystack/initialize",
  protect,
  authorizeRoles(...churchDashboardRoles),
  initializePaystackPayment
);

router.post(
  "/payments/paystack/mobile-money",
  protect,
  authorizeRoles(...churchDashboardRoles),
  chargePaystackMobileMoney
);

router.post(
  "/payments/paystack/verify",
  protect,
  authorizeRoles(...churchDashboardRoles),
  verifyPaystackPayment
);

router.get(
  "/billing-history",
  protect,
  authorizeRoles(...churchDashboardRoles),
  getMyBillingHistory
);

router.get(
  "/billing-history/:id/invoice",
  protect,
  authorizeRoles(...churchDashboardRoles),
  downloadBillingInvoice
);

router.post(
  "/payment-methods/mobile-money",
  protect,
  authorizeRoles(...churchDashboardRoles),
  addMobileMoneyPaymentMethod
);

router.post(
  "/payment-methods/card",
  protect,
  authorizeRoles(...churchDashboardRoles),
  addCardPaymentMethod
);

router.delete(
  "/payment-methods/:methodId",
  protect,
  authorizeRoles(...churchDashboardRoles),
  removePaymentMethod
);

router.post(
  "/subscriptions/change-plan",
  protect,
  authorizeRoles(...churchDashboardRoles),
  changePlan
);

router.post(
  "/subscriptions/cancel",
  protect,
  authorizeRoles(...churchDashboardRoles),
  cancelSubscription
);

router.post("/webhooks/paystack", paystackWebhook);


// Paystack webhook
// router.post("/paystack", express.raw({ type: "application/json" }), chargeWithPaystack);

export default router;
