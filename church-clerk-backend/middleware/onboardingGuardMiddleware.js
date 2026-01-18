export const onboardingGuard = (req, res, next) => {
  // Super & support admins bypass onboarding
  if (["superadmin", "supportadmin"].includes(req.user.role)) {
    return next();
  }

  if (!req.user.onboardingComplete) {
    return res.status(403).json({
      message: "Onboarding incomplete. Please register your church."
    });
  }

  next();
};
