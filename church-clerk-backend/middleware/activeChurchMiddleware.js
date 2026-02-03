import Church from "../models/churchModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";

export const setActiveChurch = async (req, res, next) => {
  try {
     // System admin (no church) should skip church context
    if (!req.user?.church && req.user?.role !== "superadmin") {
      req.activeChurch = null;    // explicitly set for dashboard controllers
      return next();
    }

    const activeChurchId =
      req.headers["x-active-church"] || req.user.church;

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
      req.user.role !== "superadmin" &&
      activeChurchId.toString() !== req.user.church.toString()
    ) {
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

    const subscription = await Subscription.findOne({ church: activeChurchId })
      .populate("plan")
      .lean();

    const effectivePlan = subscription?.status === "trialing"
      ? await Plan.findOne({ name: "premium", isActive: true }).lean()
      : subscription?.plan;

    const planName = effectivePlan?.name || "basic";

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
