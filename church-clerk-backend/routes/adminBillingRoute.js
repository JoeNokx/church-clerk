import express from "express";

import { protectAdmin } from "../middleware/authMiddleware.js";
import requireSystemRole from "../middleware/requireSystemRole.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

import {
  createPlan,
  deletePlan,
  getPlans,
  getPayments,
  getSubscriptions,
  getRevenueStats,
  getInvoices,
  createInvoice,
  markInvoiceStatus,
  downloadInvoice,
  getWebhookLogs,
  updateSubscription,
  adminSuspendSubscription,
  adminResumeSubscription,
  adminDeleteSubscription,
  verifyPayment,
  updatePlan
} from "../controller/adminBillingController.js";
import { runDailyBillingJob } from "../cron/billingCronController.js";

const router = express.Router();

router.use(protectAdmin);
router.use(attachPermissions);
router.use(requireSystemRole);

router.post("/plans", requirePermission("systemBilling", "create"), createPlan);
router.get("/plans", requirePermission("systemBilling", "read"), getPlans);
router.put("/plans/:id", requirePermission("systemBilling", "update"), updatePlan);
router.delete("/plans/:id", requirePermission("systemBilling", "delete"), deletePlan);

router.get("/subscriptions", requirePermission("systemBilling", "read"), getSubscriptions);

router.put("/subscriptions/:id", requirePermission("systemBilling", "update"), updateSubscription);
router.post("/subscriptions/:id/suspend", requirePermission("systemBilling", "update"), adminSuspendSubscription);
router.post("/subscriptions/:id/resume", requirePermission("systemBilling", "update"), adminResumeSubscription);
router.delete("/subscriptions/:id", requirePermission("systemBilling", "delete"), adminDeleteSubscription);

router.get("/payments", requirePermission("systemBilling", "read"), getPayments);
router.post("/payments/:id/verify", requirePermission("systemBilling", "update"), verifyPayment);

router.get("/revenue", requirePermission("systemBilling", "read"), getRevenueStats);

router.get("/invoices", requirePermission("systemBilling", "read"), getInvoices);
router.post("/invoices", requirePermission("systemBilling", "create"), createInvoice);
router.put("/invoices/:id/status", requirePermission("systemBilling", "update"), markInvoiceStatus);
router.get("/invoices/:id/download", requirePermission("systemBilling", "read"), downloadInvoice);

router.get("/webhook-logs", requirePermission("systemBilling", "read"), getWebhookLogs);

router.post("/test/run-billing-cron", requirePermission("systemBilling", "runCycle"), async (req, res) => {
  try {
    console.log("[AdminRoute] Manual billing cron triggered");
    await runDailyBillingJob();
    return res.json({ message: "Billing cron completed. Check server logs for details." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
