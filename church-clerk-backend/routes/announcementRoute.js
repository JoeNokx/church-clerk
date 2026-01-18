import express from "express";
const router = express.Router();
import {getAllAnnouncements, getSingleAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement} from "../controller/announcementController.js"
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get("/get-announcements", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllAnnouncements);
router.get("/get-announcement/:id", protect, authorizeRoles("superadmin", "admin"), getSingleAnnouncement); 
router.post("/create-announcement", protect, authorizeRoles("superadmin", "admin"), createAnnouncement);
router.put("/update-announcement/:id", protect, authorizeRoles("superadmin", "admin"), updateAnnouncement);
router.delete("/delete-announcement/:id", protect, authorizeRoles("superadmin", "admin"), deleteAnnouncement);


export default router