import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { SYSTEM_ROLES } from "../config/roles.js";

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

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
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

export { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin };
