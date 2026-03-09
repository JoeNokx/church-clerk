import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

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

router.get("/active", protect, authorizeRoles(...allowedRoles), listActiveInAppAnnouncementsForUser);
router.post("/:id/seen", protect, authorizeRoles(...allowedRoles), markInAppAnnouncementSeen);
router.post("/:id/acknowledge", protect, authorizeRoles(...allowedRoles), acknowledgeInAppAnnouncement);
router.post("/:id/dismiss", protect, authorizeRoles(...allowedRoles), dismissInAppAnnouncement);

export default router;
