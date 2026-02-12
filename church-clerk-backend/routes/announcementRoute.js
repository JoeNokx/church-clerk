import express from "express";
const router = express.Router();
import {getAllAnnouncements, getSingleAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement} from "../controller/announcementController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


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


export default router