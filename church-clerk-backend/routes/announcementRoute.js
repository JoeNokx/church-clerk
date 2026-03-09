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

router.post(
  "/wallet/webhooks/paystack",
  paystackWalletWebhook
);

router.get(
  "/announcements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getAllAnnouncements
);
router.get(
  "/announcements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  getSingleAnnouncement
);
router.post(
  "/announcements",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  createAnnouncement
);
router.put(
  "/announcements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  updateAnnouncement
);
router.delete(
  "/announcements/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  deleteAnnouncement
);

router.get(
  "/wallet",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getWallet
);

router.get(
  "/wallet/transactions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getWalletTransactions
);

router.post(
  "/wallet/fund/initiate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  initiateWalletFunding
);

router.post(
  "/wallet/fund/verify",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  verifyWalletFunding
);

router.post(
  "/messages",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  createMessage
);

router.post(
  "/messages/estimate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  estimateMessageCost
);

router.get(
  "/messages",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getMessages
);

router.get(
  "/messages/:id/report",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getMessageDeliveryReport
);

router.put(
  "/messages/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  updateScheduledMessage
);

router.delete(
  "/messages/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  deleteScheduledMessage
);

router.get(
  "/templates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  getTemplates
);

router.post(
  "/templates",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  createTemplate
);

router.put(
  "/templates/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  updateTemplate
);

router.delete(
  "/templates/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  deleteTemplate
);


export default router