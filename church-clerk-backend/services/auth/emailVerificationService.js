import User from "../../models/userModel.js";
import crypto from "node:crypto";
import { sendEmail } from "../emailService.js";
import { getVerificationEmailTemplate, getRegistrationEmailTemplate, getFrontendBaseUrl } from "../../utils/emailTemplates.js";
import { logActivity } from "../../utils/activityLogger.js";
import { getClientIp, parseUserAgentMeta } from "../../utils/requestHelpers.js";

async function verifyEmailToken(token, email) {
  const user = await User.findOne({ emailVerificationToken: String(token).trim() }).populate("church", "name");
  if (user) {
    if (user.isEmailVerified === true) {
      return { user, alreadyVerified: true };
    }

    user.isEmailVerified = true;
    await user.save();

    return { user, alreadyVerified: false };
  }

  // The token may have been rotated (resend) or cleared while the account
  // itself is already verified — fall back to the email hint from the link.
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (normalizedEmail) {
    const emailUser = await User.findOne({ email: normalizedEmail }).select("isEmailVerified").lean();
    if (emailUser?.isEmailVerified === true) {
      return { user: null, alreadyVerified: true };
    }
  }

  throw new Error("Invalid or expired verification token");
}

async function getVerificationSessionStatus(sessionToken) {
  const user = await User.findOne({ pendingVerificationToken: String(sessionToken || "").trim() }).populate("church", "name");
  if (!user) {
    throw new Error("Invalid or expired verification session");
  }

  if (user.isEmailVerified !== true) {
    return { verified: false };
  }

  user.pendingVerificationToken = null;
  await user.save();

  return { verified: true, user };
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

  const link = `${getFrontendBaseUrl()}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email - Church Clerk",
    html: getVerificationEmailTemplate(user.fullName, verificationToken, user.email)
  });

  return { success: true, message: "Verification email sent." };
}

async function sendRegistrationVerificationEmail(user) {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = verificationToken;
  await User.findByIdAndUpdate(user._id, { emailVerificationToken: verificationToken });

  const link = `${getFrontendBaseUrl()}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
  let emailSent = false;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your email - Church Clerk",
      html: getRegistrationEmailTemplate(user.fullName, verificationToken, user.email)
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

export { verifyEmailToken, resendVerificationEmail, sendRegistrationVerificationEmail, getVerificationSessionStatus };
