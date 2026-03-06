import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
  listMyNotifications,
  getMyUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
} from "../controller/notificationController.js";

const router = express.Router();

const allowedRoles = [
  "superadmin",
  "supportadmin",
  "churchadmin",
  "associateadmin",
  "secretary",
  "financialofficer",
  "leader"
];

router.get("/", protect, authorizeRoles(...allowedRoles), listMyNotifications);
router.get("/unread-count", protect, authorizeRoles(...allowedRoles), getMyUnreadCount);
router.patch("/:id/read", protect, authorizeRoles(...allowedRoles), markNotificationRead);
router.post("/read-all", protect, authorizeRoles(...allowedRoles), markAllNotificationsRead);

export default router;
