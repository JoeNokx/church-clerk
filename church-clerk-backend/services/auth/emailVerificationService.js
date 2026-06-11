import User from "../../models/userModel.js";
import crypto from "node:crypto";
import { sendEmail } from "../emailService.js";
import { getVerificationEmailTemplate, getRegistrationEmailTemplate, getFrontendBaseUrl } from "../../utils/emailTemplates.js";
import { logActivity } from "../../utils/activityLogger.js";
import { getClientIp, parseUserAgentMeta } from "../../utils/requestHelpers.js";

async function verifyEmailToken(token) {
  const user = await User.findOne({ emailVerificationToken: String(token).trim() }).populate("church", "name");
  if (!user) {
    throw new Error("Invalid or expired verification token");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  await user.save();

  return user;
}

async function resendVerificationEmail(email, req) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { success: true, message: "If an account exists for that email, a verification link has been sent." };
  }

  if (user.isEmailVerified === true) {
    return { success: true, message: "Your email is already verified." };
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = verificationToken;
  await user.save();

  const link = `${getFrontendBaseUrl()}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email - Church Clerk",
    html: getVerificationEmailTemplate(user.fullName, verificationToken)
  });

  return { success: true, message: "Verification email sent." };
}

async function sendRegistrationVerificationEmail(user) {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = verificationToken;
  await user.save();

  const link = `${getFrontendBaseUrl()}/verify-email?token=${verificationToken}`;
  let emailSent = false;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your email - Church Clerk",
      html: getRegistrationEmailTemplate(user.fullName, verificationToken)
    });
    emailSent = true;
  } catch (err) {
    console.error("[emailVerificationService] verification email failed", err);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[emailVerificationService] verification link (dev fallback):", link);
    }
  }

  return { emailSent, link };
}

export { verifyEmailToken, resendVerificationEmail, sendRegistrationVerificationEmail };
