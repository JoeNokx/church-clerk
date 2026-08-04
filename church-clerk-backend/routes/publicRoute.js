import express from "express";
import rateLimit from "express-rate-limit";
import { getChurchByToken, selfRegisterMember } from "../controller/publicRegistrationController.js";
import { getAttendanceByCheckInToken, memberCheckIn } from "../controller/serviceIndividualAttendanceController.js";
import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";

const router = express.Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Please try again later." }
});

router.get("/token/:token", getChurchByToken);
router.post(
  "/token/:token/register",
  registrationLimiter,
  (req, res, next) => {
    uploadMemoryFile.single("photo")(req, res, (err) => {
      if (!err) return next();
      return res.status(400).json({ message: err?.message || "File upload failed" });
    });
  },
  selfRegisterMember
);

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
