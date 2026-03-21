import express from "express";
const router = express.Router();
import {getAllAnnouncements, getSingleAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement} from "../controller/announcementController.js"
import {
  getWallet,
  getWalletTransactions,
  initiateWalletFunding,
  verifyWalletFunding,
  paystackWalletWebhook
} from "../controller/announcementWalletController.js";
import {
  createMessage,
  estimateMessageCost,
  getMessages,
  getMessageDeliveryReport,
  updateScheduledMessage,
  deleteScheduledMessage
} from "../controller/announcementMessagingController.js";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "../controller/announcementTemplateController.js";
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

router.post(
  "/wallet/webhooks/paystack",
  paystackWalletWebhook
);

router.get(
  "/announcements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  getAllAnnouncements
);
router.get(
  "/announcements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "read"),
  getSingleAnnouncement
);
router.post(
  "/announcements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "create"),
  createAnnouncement
);
router.put(
  "/announcements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "update"),
  updateAnnouncement
);
router.delete(
  "/announcements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "delete"),
  deleteAnnouncement
);

router.get(
  "/wallet",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  getWallet
);

router.get(
  "/wallet/transactions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  getWalletTransactions
);

router.post(
  "/wallet/fund/initiate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "create"),
  initiateWalletFunding
);

router.post(
  "/wallet/fund/verify",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "create"),
  verifyWalletFunding
);

router.post(
  "/messages",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "create"),
  createMessage
);

router.post(
  "/messages/estimate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  estimateMessageCost
);

router.get(
  "/messages",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  getMessages
);

router.get(
  "/messages/:id/report",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  getMessageDeliveryReport
);

router.put(
  "/messages/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "update"),
  updateScheduledMessage
);

router.delete(
  "/messages/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "delete"),
  deleteScheduledMessage
);

router.get(
  "/templates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("announcements", "read"),
  getTemplates
);

router.post(
  "/templates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "create"),
  createTemplate
);

router.put(
  "/templates/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "update"),
  updateTemplate
);

router.delete(
  "/templates/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("announcements", "delete"),
  deleteTemplate
);

export default router