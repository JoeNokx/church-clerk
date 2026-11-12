import { isSystemRole } from "../utils/resolvePermissions.js";

export const onboardingGuard = async (req, res, next) => {
  // System admin accounts bypass onboarding
  if (await isSystemRole(req.user?.role)) {
    return next();
  }

  if (!req.user.onboardingComplete) {
    return res.status(403).json({
      message: "Onboarding incomplete. Please register your church."
    });
  }

  next();
};
