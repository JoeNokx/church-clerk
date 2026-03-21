import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

import {
  listActiveInAppAnnouncementsForUser,
  markInAppAnnouncementSeen,
  acknowledgeInAppAnnouncement,
  dismissInAppAnnouncement
} from "../controller/systemInAppAnnouncementController.js";

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
  "/active",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  listActiveInAppAnnouncementsForUser
);
router.post(
  "/:id/seen",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  markInAppAnnouncementSeen
);
router.post(
  "/:id/acknowledge",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  acknowledgeInAppAnnouncement
);
router.post(
  "/:id/dismiss",
  protect,
  attachPermissions,
  authorizeRoles(...allowedRoles),
  requirePermission("dashboard", "read"),
  dismissInAppAnnouncement
);

export default router;
