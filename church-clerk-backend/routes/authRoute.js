import express from "express";

const router = express.Router();




import {registerUser, loginUser, logoutUser, updatePassword, verifyEmail, resendEmailVerification, forgotPassword, resetPassword} from "../controller/authController.js"




import { protect } from "../middleware/authMiddleware.js";

import { validateRequest } from "../middleware/validateRequest.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  verifyEmailSchema
} from "../validators/auth.js";
import { loginLimiter, passwordResetLimiter, registerLimiter } from "../middleware/rateLimiters.js";

import {setActiveChurch} from "../middleware/activeChurchMiddleware.js";

import {attachBillingBanner} from "../middleware/expiryWarningMiddleware.js";

import {readOnlyBranchGuard} from "../middleware/readOnlyBranchesMiddleware.js";

import authorizeRoles from "../middleware/roleMiddleware.js";   

import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";

router.post("/register", registerLimiter, validateRequest(registerSchema), registerUser);

router.post("/login", loginLimiter, validateRequest(loginSchema), loginUser);

router.post("/verify-email", validateRequest(verifyEmailSchema), verifyEmail);

router.post("/resend-verification", validateRequest(resendVerificationSchema), resendEmailVerification);

router.post("/forgot-password", passwordResetLimiter, validateRequest(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", passwordResetLimiter, validateRequest(resetPasswordSchema), resetPassword);

router.post("/logout", protect, logoutUser);

router.put("/password", protect, validateRequest(updatePasswordSchema), updatePassword);

export default router;






