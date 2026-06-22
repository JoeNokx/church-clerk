import generateToken from "../utils/generateToken.js";
import { verifyEmailToken, resendVerificationEmail } from "../services/auth/emailVerificationService.js";
import { initiatePasswordReset, resetPasswordWithToken, updatePassword as updatePasswordService } from "../services/auth/passwordResetService.js";
import { registerUser, loginUser, logoutUser } from "../services/auth/authService.js";

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await verifyEmailToken(token);
    const jwtToken = generateToken(user._id, "1d");

    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    user.password = undefined;

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      data: { user },
      token: jwtToken
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await resendVerificationEmail(email, req);
    return res.status(200).json({
      status: "success",
      message: result.message
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await initiatePasswordReset(email);
    
    const payload = {
      status: "success",
      message: result.message
    };

    if (process.env.NODE_ENV !== "production") {
      payload.emailSent = result.emailSent;
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await resetPasswordWithToken(token, newPassword);
    return res.status(200).json({
      status: "success",
      message: result.message
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const registerUserController = async (req, res) => {
  try {
    const { user, token, emailSent } = await registerUser(req.body, req);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user,
        nextStep: "email-verification",
        verificationEmailSent: emailSent
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

const loginUserController = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const { user, token, tokenExpiresIn } = await loginUser(email, password, rememberMe, req);

    const remember = rememberMe === true || rememberMe === "true" || rememberMe === 1 || rememberMe === "1";

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });

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
    if (error.code === "EMAIL_NOT_VERIFIED") {
      return res.status(401).json({
        status: "error",
        message: error.message,
        needsEmailVerification: true
      });
    }
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

const logoutUserController = async (req, res) => {
  try {
    await logoutUser(req.user, req);

    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: new Date(0)
    });

    res.cookie("userToken", "", {
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
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

const updatePasswordController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const result = await updatePasswordService(userId, oldPassword, newPassword, confirmPassword);
    
    return res.status(200).json({
      status: "success",
      message: result.message
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

export { 
  registerUserController as registerUser, 
  loginUserController as loginUser, 
  logoutUserController as logoutUser, 
  updatePasswordController as updatePassword, 
  verifyEmail, 
  forgotPassword, 
  resetPassword, 
  resendEmailVerification 
};