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

      effectiveRole !== "supportadmin" &&

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

      effectiveRole !== "supportadmin" &&

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

      .populate("pendingPlan")

      .lean();



    req.subscription = subscription || null;



    const now = new Date();

    const isTrial = subscription?.status === "free trial" || subscription?.status === "trialing";



    let effectivePlan = subscription?.plan || null;

    if (subscription?.pendingPlan) {

      const effectiveAt = subscription.pendingPlanEffectiveDate || subscription.nextBillingDate;

      if (effectiveAt && new Date(effectiveAt) <= now) {

        effectivePlan = subscription.pendingPlan;

      }

    }



    req.plan = effectivePlan;



    const features = effectivePlan?.features || {};



    const featureEnabled = (key) => {

      if (isTrial) return true;



      if (key === "announcements") return Boolean(features?.announcements || features?.announcement);

      if (key === "specialFunds") return Boolean(features?.specialFunds || features?.specialFund);

      if (key === "dashboard") return features?.dashboard !== false;

      if (key === "budgeting") {

        if (features?.budgeting !== undefined) return Boolean(features.budgeting);

        return Boolean(features?.financeModule);

      }



      return Boolean(features?.[key]);

    };



    const baseModules = {

      Dashboard: true,

      Branches: req.activeChurch.type === "Headquarters",

      Members: true,

      Attendance: true,

      ProgramsEvents: true,

      Ministries: true,

      Announcements: true,

      Tithe: true,

      Budgeting: true,



      ChurchProjects: true,

      SpecialFunds: true,

      Offerings: true,

      Welfare: true,

      Pledges: true,

      BusinessVentures: true,

      Expenses: true,

      FinancialStatement: true,

      ReportsAnalytics: true,



      Billing: true,

      Referrals: true,

      Settings: true,

      support: true

    };



    baseModules.Dashboard = featureEnabled("dashboard");



    req.activeChurch.modules = baseModules;



    next();

  } catch (error) {

    next(error);

  }

}

