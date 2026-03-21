import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

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

router.get(
  "/",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  listMyNotifications
);
router.get(
  "/unread-count",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  getMyUnreadCount
);
router.patch(
  "/:id/read",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  markNotificationRead
);
router.post(
  "/read-all",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  markAllNotificationsRead
);

export default router;
