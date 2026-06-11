import User from "../../models/userModel.js";
import Church from "../../models/churchModel.js";
import crypto from "node:crypto";
import generateToken from "../../utils/generateToken.js";
import { validatePhoneNumber } from "../../utils/validatePhoneNumber.js";
import { normalizeEmail } from "../../utils/requestHelpers.js";
import { sendRegistrationVerificationEmail } from "./emailVerificationService.js";
import { logActivity } from "../../utils/activityLogger.js";
import { getClientIp, parseUserAgentMeta } from "../../utils/requestHelpers.js";

async function registerUser(data, req) {
  const { fullName, email, phoneNumber, password, churchId } = data;
  const normalizedEmail = normalizeEmail(email);

  if (!fullName || !email || !phoneNumber || !password) {
    await logActivity({
      module: "Authentication",
      action: "Register",
      status: "Failed",
      userName: String(email || fullName || phoneNumber || "").trim(),
      userRole: "",
      ipAddress: getClientIp(req),
      browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
      os: parseUserAgentMeta(req.headers["user-agent"]).os,
      deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
      model: parseUserAgentMeta(req.headers["user-agent"]).model,
      httpMethod: String(req.method || ""),
      path: String(req.originalUrl || ""),
      description: "Registration failed: missing required fields",
      responseStatusCode: 400,
      userAgent: String(req.headers["user-agent"] || ""),
      req
    });
    throw new Error("all fields are required");
  }

  let validatedPhoneNumber;
  try {
    validatedPhoneNumber = validatePhoneNumber(phoneNumber, "GH");
  } catch (e) {
    throw new Error(e?.message || "Invalid phone number");
  }

  const userExisting = await User.findOne({ email: normalizedEmail });
  if (userExisting) {
    await logActivity({
      user: userExisting._id,
      module: "Authentication",
      action: "Register",
      status: "Failed",
      userName: userExisting.fullName || "",
      userRole: userExisting.role || "",
      church: userExisting.church || undefined,
      ipAddress: getClientIp(req),
      browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
      os: parseUserAgentMeta(req.headers["user-agent"]).os,
      deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
      model: parseUserAgentMeta(req.headers["user-agent"]).model,
      httpMethod: String(req.method || ""),
      path: String(req.originalUrl || ""),
      description: "Registration failed: email already registered",
      responseStatusCode: 400,
      userAgent: String(req.headers["user-agent"] || ""),
      req
    });
    throw new Error("email already registered.");
  }

  const phoneNumberExisting = await User.findOne({ phoneNumber: validatedPhoneNumber });
  if (phoneNumberExisting) {
    await logActivity({
      user: phoneNumberExisting._id,
      module: "Authentication",
      action: "Register",
      status: "Failed",
      userName: phoneNumberExisting.fullName || "",
      userRole: phoneNumberExisting.role || "",
      church: phoneNumberExisting.church || undefined,
      ipAddress: getClientIp(req),
      browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
      os: parseUserAgentMeta(req.headers["user-agent"]).os,
      deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
      model: parseUserAgentMeta(req.headers["user-agent"]).model,
      httpMethod: String(req.method || ""),
      path: String(req.originalUrl || ""),
      description: "Registration failed: phone number already registered",
      responseStatusCode: 400,
      userAgent: String(req.headers["user-agent"] || ""),
      req
    });
    throw new Error("Phone number already registered");
  }

  let church = null;
  let resolvedRole = "leader";

  if (churchId) {
    const nextChurch = await Church.findById(churchId).lean();
    if (!nextChurch) {
      throw new Error("Invalid church selected");
    }

    const existingChurchUsers = await User.countDocuments({ church: nextChurch._id });
    if (existingChurchUsers === 0) {
      church = nextChurch._id;
      resolvedRole = "churchadmin";
    } else {
      throw new Error("Users can only be added by a church admin");
    }
  }

  const user = await User.create({
    fullName,
    email: normalizedEmail,
    phoneNumber: validatedPhoneNumber,
    password,
    role: resolvedRole,
    church,
    isEmailVerified: false,
    emailVerificationToken: crypto.randomBytes(32).toString("hex")
  });

  const token = generateToken(user._id);
  user.password = undefined;

  const { emailSent } = await sendRegistrationVerificationEmail(user);

  await logActivity({
    user: user._id,
    module: "Authentication",
    action: "Register",
    status: "Success",
    userName: user.fullName || "",
    userRole: user.role || "",
    church: user.church || undefined,
    ipAddress: getClientIp(req),
    browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
    os: parseUserAgentMeta(req.headers["user-agent"]).os,
    deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
    model: parseUserAgentMeta(req.headers["user-agent"]).model,
    httpMethod: String(req.method || ""),
    path: String(req.originalUrl || ""),
    description: "User registered",
    responseStatusCode: 201,
    userAgent: String(req.headers["user-agent"] || ""),
    req
  });

  return { user, token, emailSent };
}

async function loginUser(email, password, rememberMe, req) {
  const normalizedEmail = normalizeEmail(email);
  const remember = rememberMe === true || rememberMe === "true" || rememberMe === 1 || rememberMe === "1";

  if (!normalizedEmail || !password) {
    await logActivity({
      module: "Authentication",
      action: "Login",
      status: "Failed",
      userName: String(email || "").trim(),
      ipAddress: getClientIp(req),
      browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
      os: parseUserAgentMeta(req.headers["user-agent"]).os,
      deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
      model: parseUserAgentMeta(req.headers["user-agent"]).model,
      httpMethod: String(req.method || ""),
      path: String(req.originalUrl || ""),
      description: "Login failed: missing email or password",
      responseStatusCode: 400,
      userAgent: String(req.headers["user-agent"] || ""),
      req
    });
    throw new Error("email and password are required");
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password").populate("church", "name");
  if (!user) {
    await logActivity({
      module: "Authentication",
      action: "Login",
      status: "Failed",
      userName: String(email || "").trim(),
      ipAddress: getClientIp(req),
      browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
      os: parseUserAgentMeta(req.headers["user-agent"]).os,
      deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
      model: parseUserAgentMeta(req.headers["user-agent"]).model,
      httpMethod: String(req.method || ""),
      path: String(req.originalUrl || ""),
      description: "Login failed: user not found",
      responseStatusCode: 400,
      userAgent: String(req.headers["user-agent"] || ""),
      req
    });
    throw new Error("email or password incorrect.");
  }

  if (user.role === "superadmin" || user.role === "supportadmin") {
    throw new Error("Please log in via the admin portal");
  }

  if (user.isEmailVerified === false) {
    throw new Error("Please verify your email to continue.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await logActivity({
      user: user._id,
      module: "Authentication",
      action: "Login",
      status: "Failed",
      userName: user.fullName || "",
      userRole: user.role || "",
      church: user.church?._id || user.church || undefined,
      ipAddress: getClientIp(req),
      browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
      os: parseUserAgentMeta(req.headers["user-agent"]).os,
      deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
      model: parseUserAgentMeta(req.headers["user-agent"]).model,
      httpMethod: String(req.method || ""),
      path: String(req.originalUrl || ""),
      description: "Login failed: incorrect password",
      responseStatusCode: 401,
      userAgent: String(req.headers["user-agent"] || ""),
      req
    });
    throw new Error("Email or password incorrect");
  }

  const tokenExpiresIn = remember ? "30d" : "1d";
  const token = generateToken(user._id, tokenExpiresIn);
  user.password = undefined;

  await logActivity({
    user: user._id,
    module: "Authentication",
    action: "Login",
    status: "Success",
    userName: user.fullName || "",
    userRole: user.role || "",
    church: user.church?._id || user.church || undefined,
    ipAddress: getClientIp(req),
    browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
    os: parseUserAgentMeta(req.headers["user-agent"]).os,
    deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
    model: parseUserAgentMeta(req.headers["user-agent"]).model,
    httpMethod: String(req.method || ""),
    path: String(req.originalUrl || ""),
    description: "Login successful",
    responseStatusCode: 200,
    userAgent: String(req.headers["user-agent"] || ""),
    req
  });

  return { user, token, tokenExpiresIn };
}

async function logoutUser(user, req) {
  await logActivity({
    user: user?._id,
    module: "Authentication",
    action: "Logout",
    status: "Success",
    userName: user?.fullName || "",
    userRole: user?.role || "",
    church: user?.church || undefined,
    ipAddress: getClientIp(req),
    browser: parseUserAgentMeta(req.headers["user-agent"]).browser,
    os: parseUserAgentMeta(req.headers["user-agent"]).os,
    deviceType: parseUserAgentMeta(req.headers["user-agent"]).deviceType,
    model: parseUserAgentMeta(req.headers["user-agent"]).model,
    httpMethod: String(req.method || ""),
    path: String(req.originalUrl || ""),
    description: "Logged out",
    responseStatusCode: 200,
    userAgent: String(req.headers["user-agent"] || ""),
    req
  });

  return { success: true, message: "Logged out successfully" };
}

export { registerUser, loginUser, logoutUser };
