import express from "express";

import { protectAdmin } from "../middleware/authMiddleware.js";
import requireSuperAdmin from "../middleware/requireSuperAdmin.js";
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
  verifyPayment,
  updatePlan
} from "../controller/adminBillingController.js";

const router = express.Router();

router.use(protectAdmin);
router.use(attachPermissions);
router.use(requireSuperAdmin);

router.post("/plans", requirePermission("billing", "create"), createPlan);
router.get("/plans", requirePermission("billing", "read"), getPlans);
router.put("/plans/:id", requirePermission("billing", "update"), updatePlan);
router.delete("/plans/:id", requirePermission("billing", "delete"), deletePlan);

router.get("/subscriptions", requirePermission("billing", "read"), getSubscriptions);

router.put("/subscriptions/:id", requirePermission("billing", "update"), updateSubscription);

router.get("/payments", requirePermission("billing", "read"), getPayments);
router.post("/payments/:id/verify", requirePermission("billing", "update"), verifyPayment);

router.get("/revenue", requirePermission("billing", "read"), getRevenueStats);

router.get("/invoices", requirePermission("billing", "read"), getInvoices);
router.post("/invoices", requirePermission("billing", "create"), createInvoice);
router.put("/invoices/:id/status", requirePermission("billing", "update"), markInvoiceStatus);
router.get("/invoices/:id/download", requirePermission("billing", "read"), downloadInvoice);

router.get("/webhook-logs", requirePermission("billing", "read"), getWebhookLogs);

export default router;
