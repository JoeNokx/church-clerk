import express from "express";

import { protectAdmin } from "../middleware/authMiddleware.js";
import requireSuperAdmin from "../middleware/requireSuperAdmin.js";

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
  verifyPayment,
  updatePlan
} from "../controller/adminBillingController.js";

const router = express.Router();

router.use(protectAdmin);
router.use(requireSuperAdmin);

router.post("/plans", createPlan);
router.get("/plans", getPlans);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

router.get("/subscriptions", getSubscriptions);

router.put("/subscriptions/:id", updateSubscription);

router.get("/payments", getPayments);
router.post("/payments/:id/verify", verifyPayment);

router.get("/revenue", getRevenueStats);

router.get("/invoices", getInvoices);
router.post("/invoices", createInvoice);
router.put("/invoices/:id/status", markInvoiceStatus);
router.get("/invoices/:id/download", downloadInvoice);

router.get("/webhook-logs", getWebhookLogs);

export default router;
