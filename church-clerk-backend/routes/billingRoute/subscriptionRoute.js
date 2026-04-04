import express from "express";
// import { chargeWithPaystack } from "../controllers/billingController/paystackController.js";

import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js"; 
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { chargePaystackMobileMoney, initializePaystackPayment, verifyPaystackPayment, getPaystackBanks } from "../../controller/billingController/paystackController.js";
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
  addBankPaymentMethod,
  updatePaymentMethod,
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
  attachPermissions,
  authorizeRoles("churchadmin"),
  requirePermission("billing", "create"),
  chooseSubscription
);

// -----------------------------
// 2. Upgrade trial to plan immediately
// -----------------------------
router.post(
  "/subscriptions/upgrade",
  protect,
  attachPermissions,
  authorizeRoles("churchadmin"),
  requirePermission("billing", "create"),
  upgradeTrialToPlan
);

// -----------------------------
// 3. View subscription (for frontend banner etc)
// -----------------------------
router.get(
  "/subscriptions/me",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "read"),
  getMySubscription
);

router.get(
  "/plans",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "read"),
  getAvailablePlans
);

router.post(
  "/payments/paystack/initialize",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "create"),
  initializePaystackPayment
);

router.post(
  "/payments/paystack/mobile-money",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "create"),
  chargePaystackMobileMoney
);

router.post(
  "/payments/paystack/verify",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "create"),
  verifyPaystackPayment
);

router.get(
  "/payments/paystack/banks",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "read"),
  getPaystackBanks
);

router.get(
  "/billing-history",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "read"),
  getMyBillingHistory
);

router.get(
  "/billing-history/:id/invoice",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "read"),
  downloadBillingInvoice
);

router.post(
  "/payment-methods/mobile-money",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "create"),
  addMobileMoneyPaymentMethod
);

router.post(
  "/payment-methods/card",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "create"),
  addCardPaymentMethod
);

router.post(
  "/payment-methods/bank",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "create"),
  addBankPaymentMethod
);

router.delete(
  "/payment-methods/:methodId",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "delete"),
  removePaymentMethod
);

router.put(
  "/payment-methods/:methodId",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "update"),
  updatePaymentMethod
);

router.post(
  "/subscriptions/change-plan",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "update"),
  changePlan
);

router.post(
  "/subscriptions/cancel",
  protect,
  attachPermissions,
  authorizeRoles(...churchDashboardRoles),
  requirePermission("billing", "delete"),
  cancelSubscription
);

router.post("/webhooks/paystack", express.raw({ type: "application/json" }), paystackWebhook);


// Paystack webhook
// router.post("/paystack", express.raw({ type: "application/json" }), chargeWithPaystack);

export default router;
