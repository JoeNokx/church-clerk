import express from "express";
const router = express.Router();
import {getAllAnnouncements, getSingleAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement} from "../controller/announcementController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get("/announcements", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllAnnouncements);
router.get("/announcements/:id", protect, authorizeRoles("superadmin", "admin"), getSingleAnnouncement); 
router.post("/announcements", protect, authorizeRoles("superadmin", "admin"), createAnnouncement);
router.put("/announcements/:id", protect, authorizeRoles("superadmin", "admin"), updateAnnouncement);
router.delete("/announcements/:id", protect, authorizeRoles("superadmin", "admin"), deleteAnnouncement);


export default router