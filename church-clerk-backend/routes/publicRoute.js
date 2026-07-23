import express from "express";
import rateLimit from "express-rate-limit";
import { getChurchByToken, selfRegisterMember } from "../controller/publicRegistrationController.js";
import { getAttendanceByCheckInToken, memberCheckIn } from "../controller/serviceIndividualAttendanceController.js";

const router = express.Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Please try again later." }
});

router.get("/token/:token", getChurchByToken);
router.post("/token/:token/register", registrationLimiter, selfRegisterMember);

const checkInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many check-in attempts. Please try again later." }
});

router.get("/attendance/:token", getAttendanceByCheckInToken);
router.post("/attendance/:token/check-in", checkInLimiter, memberCheckIn);

export default router;
