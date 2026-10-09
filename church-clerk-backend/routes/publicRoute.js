import express from "express";
import rateLimit from "express-rate-limit";
import { getChurchByToken, selfRegisterMember } from "../controller/publicRegistrationController.js";
import { getAttendanceByCheckInToken, memberCheckIn } from "../controller/serviceIndividualAttendanceController.js";
import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";
import { sendEmail } from "../services/emailService.js";

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

// ── Public contact form ──────────────────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many contact requests. Please try again later." }
});

router.post("/contact", contactLimiter, async (req, res) => {
  try {
    const name    = String(req.body?.name    || "").trim();
    const email   = String(req.body?.email   || "").trim();
    const church  = String(req.body?.church  || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required." });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    const supportEmail = process.env.SUPPORT_EMAIL || "nokaeldev@gmail.com";
    const appName = process.env.APP_NAME || "Church Clerk";

    await sendEmail({
      to: supportEmail,
      subject: `Contact form message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px;">
          <h2 style="margin: 0 0 16px; color: #1e3a8a;">New Contact Form Message — ${appName}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            ${church ? `<tr><td style="padding: 8px 0; color: #6b7280;">Church</td><td style="padding: 8px 0;">${church}</td></tr>` : ""}
          </table>
          <p style="color: #374151; font-weight: 600; margin: 0 0 8px;">Message:</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; white-space: pre-wrap; color: #374151;">${message}</div>
          <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">Reply directly to ${email} to respond.</p>
        </div>
      `
    });

    return res.status(200).json({ status: "success", message: "Message sent. We'll be in touch soon." });
  } catch (err) {
    console.error("[ContactRoute] email failed:", err?.message || err);
    return res.status(500).json({ message: "Failed to send message. Please try again." });
  }
});

export default router;
