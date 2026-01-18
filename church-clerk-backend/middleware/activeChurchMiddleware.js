import Church from "../models/churchModel.js";

export const setActiveChurch = async (req, res, next) => {
  try {
     // System admin (no church) should skip church context
    if (!req.user?.church) {
      req.activeChurch = null;    // explicitly set for dashboard controllers
      return next();
    }

    const activeChurchId =
      req.headers["x-active-church"] || req.user.church;

    const church = await Church.findById(activeChurchId).lean();

    if (!church) {
      return res.status(404).json({ message: "Church context not found" });
    }

    // Switching church context (HQ → Branch only)
    if (activeChurchId.toString() !== req.user.church.toString()) {
      const userChurch = await Church.findById(req.user.church);

      if (
        userChurch.type !== "Headquarters" ||
        church.parentChurch?.toString() !== userChurch._id.toString()
      ) {
        return res.status(403).json({ message: "Unauthorized branch access" });
      }
    }

    req.activeChurch = church;

      req.activeChurch.canEdit =
  req.user.role === "superadmin" ||
  req.activeChurch._id.toString() === req.user.church?.toString();

      //modules for frontend
    req.activeChurch.visibleModules =
      church.type === "Branch"
        ? [
            "Dashboard",
            "People & Ministries",         // just a label for grouping
            "Members",
            "Attendance",
            "Programs & Events",
            "Ministries",
            "Announcements",
            "Finance",        // just a label for grouping
            "Tithe",
            "Church Projects",
            "Special Funds",
            "Offerings",
            "Welfare",
            "Pledges",
            "Business Ventures",
            "Expenses",
            "Financial Statement"
          ]
        : [
            "Dashboard",
            "Branches",           // only HQ module
            "People & Ministries",         // just a label for grouping
            "Members",
            "Attendance",
            "Programs & Events",
            "Ministries",
            "Announcements",
            "Finance",        // just a label for grouping
            "Tithe",
            "Church Projects",
            "Special Funds",
            "Offerings",
            "Welfare",
            "Pledges",
            "Business Ventures",
            "Expenses",
            "Financial Statement",
            "Administration",          // just a label for grouping
            "Reports & Analytics",
            "Billing",
            "Referrals",
            "Settings",
            "Support & Help"
          ];

    next();
  } catch (error) {
    next(error);
  }
};
