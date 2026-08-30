import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import {
  createSupportRequest,
  getMyTickets,
  getMyTicketById,
  confirmResolution
} from "../controller/supportRequestController.js";

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many support requests. Please try again later." }
});

router.post("/", protect, setActiveChurch, submitLimiter, createSupportRequest);
router.get("/my", protect, getMyTickets);
router.get("/my/:id", protect, getMyTicketById);
router.post("/my/:id/confirm", protect, confirmResolution);

export default router;
