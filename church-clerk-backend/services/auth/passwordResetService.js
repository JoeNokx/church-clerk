import User from "../../models/userModel.js";
import crypto from "node:crypto";
import { sendEmail } from "../emailService.js";
import { getPasswordResetEmailTemplate, getFrontendBaseUrl } from "../../utils/emailTemplates.js";

async function initiatePasswordReset(email) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { success: true, message: "If an account exists for that email, a reset link has been sent." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  let emailSent = false;
  try {
    const link = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your password - Church Clerk",
      html: getPasswordResetEmailTemplate(user.fullName, resetToken)
    });
    emailSent = true;
  } catch (err) {
    console.error("[passwordResetService] email failed", err);
    if (process.env.NODE_ENV !== "production") {
      const link = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;
      console.warn("[passwordResetService] reset link (dev fallback):", link);
    }
  }

  return { success: true, message: "If an account exists for that email, a reset link has been sent.", emailSent };
}

async function resetPasswordWithToken(token, newPassword) {
  const t = String(token || "").trim();
  if (!t) {
    throw new Error("Reset token is required");
  }
  if (!newPassword) {
    throw new Error("New password is required");
  }

  const user = await User.findOne({
    passwordResetToken: t,
    passwordResetExpires: { $gt: new Date() }
  }).select("+password");

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return { success: true, message: "Password reset successfully" };
}

async function updatePassword(userId, oldPassword, newPassword, confirmPassword) {
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new Error("All fields are required");
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new Error("Old password incorrect.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  user.password = newPassword;
  await user.save();

  user.password = undefined;
  return { success: true, message: "Password updated successfully", user };
}

export { initiatePasswordReset, resetPasswordWithToken, updatePassword };
