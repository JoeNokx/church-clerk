import User from "../models/userModel.js";
import Church from "../models/churchModel.js";
import generateToken from "../utils/generateToken.js";
import ActivityLog from "../models/activityLogModel.js";

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "";
}

function parseUserAgentMeta(uaRaw) {
  const ua = String(uaRaw || "");
  const lower = ua.toLowerCase();

  let os = "";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) os = "iOS";
  else if (lower.includes("mac os x") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  let browser = "";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/") && !lower.includes("chromium")) browser = "Safari";

  const isTablet = /ipad|tablet/i.test(ua);
  const isMobile = !isTablet && /mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua);
  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let model = "";
  const androidModel = ua.match(/Android\s[\d.]+;\s([^;\)]+?)\sBuild/i);
  if (androidModel?.[1]) model = String(androidModel[1]).trim();
  else if (/iPhone/i.test(ua)) model = "iPhone";
  else if (/iPad/i.test(ua)) model = "iPad";
  else if (/Macintosh/i.test(ua)) model = "Mac";
  else if (/Windows/i.test(ua)) model = "Windows PC";

  return {
    browser,
    os,
    deviceType,
    model
  };
}

//POST: register a new user
const registerUser = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, churchId } = req.body;
    if (!fullName || !email || !phoneNumber || !password) {
      try {
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        await ActivityLog.create({
          module: "Authentication",
          action: "Register",
          status: "Failed",
          userName: String(email || fullName || phoneNumber || "").trim(),
          userRole: "",
          ipAddress: getClientIp(req),
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          description: "Registration failed: missing required fields",
          responseStatusCode: 400,
          userAgent
        });
      } catch {
        void 0;
      }
      return res.status(400).json({ message: "all fields are required" });
    }

    //check if user exist
    const userExisting = await User.findOne({ email });
    if (userExisting) {
      try {
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        await ActivityLog.create({
          user: userExisting._id,
          module: "Authentication",
          action: "Register",
          status: "Failed",
          userName: userExisting.fullName || "",
          userRole: userExisting.role || "",
          church: userExisting.church || undefined,
          ipAddress: getClientIp(req),
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          description: "Registration failed: email already registered",
          responseStatusCode: 400,
          userAgent
        });
      } catch {
        void 0;
      }
      return res.status(400).json({ message: "email already registered." });
    }

    //Check if user already exists
    const phoneNumberExisting = await User.findOne({ phoneNumber });
    if (phoneNumberExisting) {
      try {
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        await ActivityLog.create({
          user: phoneNumberExisting._id,
          module: "Authentication",
          action: "Register",
          status: "Failed",
          userName: phoneNumberExisting.fullName || "",
          userRole: phoneNumberExisting.role || "",
          church: phoneNumberExisting.church || undefined,
          ipAddress: getClientIp(req),
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          description: "Registration failed: phone number already registered",
          responseStatusCode: 400,
          userAgent
        });
      } catch {
        void 0;
      }
      return res.status(400).json({ message: "Phone number already registered" });
    }

    let church = null;
    let resolvedRole = "leader";

    if (churchId) {
      const nextChurch = await Church.findById(churchId).lean();
      if (!nextChurch) {
        return res.status(400).json({ message: "Invalid church selected" });
      }

      const existingChurchUsers = await User.countDocuments({ church: nextChurch._id });
      if (existingChurchUsers === 0) {
        church = nextChurch._id;
        resolvedRole = "churchadmin";
      } else {
        return res.status(403).json({ message: "Users can only be added by a church admin" });
      }
    }

    //save user to databse
    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role: resolvedRole,
      church
    });

    console.log(user);

    // Generate token
    const token = generateToken(user._id);

    user.password = undefined;

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 24 * 60 * 60 * 1000
    });

    //user successful registered
    console.log("user registered successfully...");

    try {
      const userAgent = String(req.headers["user-agent"] || "");
      const meta = parseUserAgentMeta(userAgent);
      await ActivityLog.create({
        user: user._id,
        module: "Authentication",
        action: "Register",
        status: "Success",
        userName: user.fullName || "",
        userRole: user.role || "",
        church: user.church || undefined,
        ipAddress: getClientIp(req),
        browser: meta.browser,
        os: meta.os,
        deviceType: meta.deviceType,
        model: meta.model,
        httpMethod: String(req.method || ""),
        path: String(req.originalUrl || ""),
        description: "User registered",
        responseStatusCode: 201,
        userAgent
      });
    } catch {
      void 0;
    }

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user,
        nextStep: "church-registration"
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

//POST: login an existing user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    //check if both fields are filled
    if (!email || !password) {
      try {
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        await ActivityLog.create({
          module: "Authentication",
          action: "Login",
          status: "Failed",
          userName: String(email || "").trim(),
          ipAddress: getClientIp(req),
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          description: "Login failed: missing email or password",
          responseStatusCode: 400,
          userAgent
        });
      } catch {
        void 0;
      }
      return res.status(400).json({ message: "email and password are required" });
    }

    //check if user exist
    const user = await User.findOne({ email }).select("+password").populate("church", "name");
    if (!user) {
      try {
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        await ActivityLog.create({
          module: "Authentication",
          action: "Login",
          status: "Failed",
          userName: String(email || "").trim(),
          ipAddress: getClientIp(req),
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          description: "Login failed: user not found",
          responseStatusCode: 400,
          userAgent
        });
      } catch {
        void 0;
      }
      return res.status(400).json({ message: "email or password incorrect." });
    }

    if (user.role === "superadmin" || user.role === "supportadmin") {
      return res.status(403).json({ message: "Please log in via the admin portal" });
    }

    //check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      try {
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        await ActivityLog.create({
          user: user._id,
          module: "Authentication",
          action: "Login",
          status: "Failed",
          userName: user.fullName || "",
          userRole: user.role || "",
          church: user.church?._id || user.church || undefined,
          ipAddress: getClientIp(req),
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          description: "Login failed: incorrect password",
          responseStatusCode: 401,
          userAgent
        });
      } catch {
        void 0;
      }
      return res.status(401).json({ message: "Email or password incorrect" });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password before sending response
    user.password = undefined;

    // Send token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    //login successful
    try {
      const userAgent = String(req.headers["user-agent"] || "");
      const meta = parseUserAgentMeta(userAgent);
      await ActivityLog.create({
        user: user._id,
        module: "Authentication",
        action: "Login",
        status: "Success",
        userName: user.fullName || "",
        userRole: user.role || "",
        church: user.church?._id || user.church || undefined,
        ipAddress: getClientIp(req),
        browser: meta.browser,
        os: meta.os,
        deviceType: meta.deviceType,
        model: meta.model,
        httpMethod: String(req.method || ""),
        path: String(req.originalUrl || ""),
        description: "Login successful",
        responseStatusCode: 200,
        userAgent
      });
    } catch {
      void 0;
    }
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user,
        activeChurch: req.activeChurch,
        permissions: req.permissions
      },
      token: token
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

//logout user
const logoutUser = async (req, res) => {
  try {
    // Expire the token cookie immediately
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: new Date(0)
    });

    try {
      const userAgent = String(req.headers["user-agent"] || "");
      const meta = parseUserAgentMeta(userAgent);
      await ActivityLog.create({
        user: req.user?._id,
        module: "Authentication",
        action: "Logout",
        status: "Success",
        userName: req.user?.fullName || "",
        userRole: req.user?.role || "",
        church: req.user?.church || undefined,
        ipAddress: getClientIp(req),
        browser: meta.browser,
        os: meta.os,
        deviceType: meta.deviceType,
        model: meta.model,
        httpMethod: String(req.method || ""),
        path: String(req.originalUrl || ""),
        description: "Logged out",
        responseStatusCode: 200,
        userAgent
      });
    } catch {
      void 0;
    }

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

//update password
const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id; // from protect middleware
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the user with password included
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password incorrect." });
    }

    // Check new password confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Remove password from response
    user.password = undefined;

    return res.status(200).json({
      status: "success",
      message: "Password updated successfully"
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

export {registerUser, loginUser, logoutUser, updatePassword}