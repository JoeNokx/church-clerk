import crypto from "node:crypto";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { SYSTEM_ROLES } from "../config/roles.js";
import { sendEmail } from "../services/emailService.js";
import { getAdminPasswordResetEmailTemplate } from "../utils/emailTemplates.js";

const registerSystemAdmin = async (req, res) => {
  try {
    if (req.user?.role !== "superadmin") {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }

    const { fullName, email, phoneNumber, password, role } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!SYSTEM_ROLES.includes(String(role))) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const emailExisting = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (emailExisting) {
      return res.status(400).json({ message: "email already registered." });
    }

    const phoneExisting = await User.findOne({ phoneNumber: String(phoneNumber).trim() }).lean();
    if (phoneExisting) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const user = await User.create({
      fullName,
      email: String(email).toLowerCase().trim(),
      phoneNumber: String(phoneNumber).trim(),
      password,
      role: String(role),
      church: null,
      isActive: true
    });

    user.password = undefined;

    return res.status(201).json({
      status: "success",
      message: "System admin created successfully",
      data: { user }
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const getSystemAdminMe = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    return res.status(200).json({
      status: "success",
      data: { user }
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const loginSystemAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");

    if (!user || !SYSTEM_ROLES.includes(String(user.role))) {
      return res.status(401).json({ message: "Email or password incorrect" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email or password incorrect" });
    }

    const token = generateToken(user._id);

    user.password = undefined;

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: { user }
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const logoutSystemAdmin = async (req, res) => {
  try {
    res.cookie("adminToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      expires: new Date(0)
    });

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const changeAdminEmail = async (req, res) => {
  try {
    const newEmail = String(req.body?.newEmail || "").toLowerCase().trim();
    const currentPassword = String(req.body?.currentPassword || "");

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ message: "New email and current password are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    if (newEmail === user.email) {
      return res.status(400).json({ message: "New email is the same as your current email." });
    }

    const taken = await User.findOne({ email: newEmail }).lean();
    if (taken) {
      return res.status(400).json({ message: "That email address is already in use." });
    }

    user.email = newEmail;
    await user.save();

    return res.status(200).json({ status: "success", message: "Email updated successfully.", data: { email: user.email } });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Something went wrong." });
  }
};

const forgotAdminPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Always return a generic message so we don't reveal whether an account exists
    const genericMsg = "If an admin account exists for that email, a reset link has been sent.";

    const user = await User.findOne({ email });
    if (!user || !SYSTEM_ROLES.includes(String(user.role))) {
      return res.status(200).json({ status: "success", message: genericMsg });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your admin password — Church Clerk",
        html: getAdminPasswordResetEmailTemplate(user.fullName, resetToken)
      });
    } catch (emailErr) {
      console.error("[adminAuthController] forgot-password email failed:", emailErr);
    }

    return res.status(200).json({ status: "success", message: genericMsg });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Something went wrong." });
  }
};

const resetAdminPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "").trim();

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select("+password");

    if (!user || !SYSTEM_ROLES.includes(String(user.role))) {
      return res.status(400).json({ message: "Invalid or expired reset link." });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({ status: "success", message: "Password reset successfully." });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Something went wrong." });
  }
};

export { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin, getSystemAdminMe, changeAdminEmail, forgotAdminPassword, resetAdminPassword };
