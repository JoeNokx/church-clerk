import Church from "../models/churchModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";

export const setActiveChurch = async (req, res, next) => {
  try {
     // System admin (no church) should skip church context
    const normalizedRole = String(req.user?.role || "").trim().toLowerCase();
    const effectiveRole = normalizedRole === "super_admin" ? "superadmin" : normalizedRole === "support_admin" ? "supportadmin" : normalizedRole;

    if (!req.user?.church && effectiveRole !== "superadmin" && effectiveRole !== "supportadmin") {
      req.activeChurch = null;    // explicitly set for dashboard controllers
      return next();
    }

    const headerChurchId = req.headers["x-active-church"];
    const userChurchId = req.user.church;

    let activeChurchId = headerChurchId || userChurchId;

    // Branch/Independent users should never switch context via header.
    // If a stale/foreign x-active-church is present, force it back to their home church.
    let userChurch = null;
    if (
      effectiveRole !== "superadmin" &&
      headerChurchId &&
      userChurchId &&
      headerChurchId.toString() !== userChurchId.toString()
    ) {
      userChurch = await Church.findById(userChurchId).lean();

      if (!userChurch || userChurch.type !== "Headquarters") {
        activeChurchId = userChurchId;
      }
    }

    if (!activeChurchId) {
      req.activeChurch = null;
      return next();
    }

    const church = await Church.findById(activeChurchId).lean();

    if (!church) {
      return res.status(404).json({ message: "Church context not found" });
    }

    // Switching church context (HQ → Branch only)
    if (
      effectiveRole !== "superadmin" &&
      userChurchId &&
      activeChurchId.toString() !== userChurchId.toString()
    ) {
      if (!userChurch) {
        userChurch = await Church.findById(userChurchId).lean();
      }

      if (
        !userChurch ||
        userChurch.type !== "Headquarters" ||
        church.parentChurch?.toString() !== userChurch._id.toString()
      ) {
        return res.status(403).json({ message: "Unauthorized branch access" });
      }
    }

    req.activeChurch = church;

    req.activeChurch.canEdit =
      effectiveRole === "superadmin" ||
      effectiveRole === "supportadmin" ||
      req.activeChurch._id.toString() === userChurchId?.toString();

    const subscription = await Subscription.findOne({ church: activeChurchId })
      .populate("plan")
      .lean();

    const isTrial = subscription?.status === "free trial" || subscription?.status === "trialing";
    const planName = isTrial ? "premium" : (subscription?.plan?.name || "basic");

    const baseModules = {
      Dashboard: true,
      Branches: false,
      Members: true,
      Attendance: true,
      Ministries: true,
      Announcements: true,
      Tithe: false,
      ChurchProjects: false,
      SpecialFunds: false,
      Offerings: false,
      Welfare: false,
      Pledges: false,
      BusinessVentures: false,
      Expenses: false,
      FinancialStatement: false,
      ReportsAnalytics: false,
      Billing: true,
      Referrals: true,
      Settings: true,
      support: true
    };

    if (planName === "standard" || planName === "premium") {
      baseModules.Tithe = true;
      baseModules.ChurchProjects = true;
      baseModules.SpecialFunds = true;
      baseModules.Offerings = true;
      baseModules.Welfare = true;
      baseModules.Pledges = true;
      baseModules.BusinessVentures = true;
      baseModules.Expenses = true;
      baseModules.FinancialStatement = true;
    }

    if (planName === "premium") {
      baseModules.Branches = req.activeChurch.type === "Headquarters";
      baseModules.ReportsAnalytics = true;
    }

    req.activeChurch.modules = baseModules;

    next();
  } catch (error) {
    next(error);
  }
}
