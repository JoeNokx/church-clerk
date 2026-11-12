import Church from "../models/churchModel.js";

import Subscription from "../models/billingModel/subscriptionModel.js";

import Plan from "../models/billingModel/planModel.js";

import { isFeatureEnabledInPlan } from "../utils/featureUsageChecker.js";

import { isSystemRole } from "../utils/resolvePermissions.js";



export const setActiveChurch = async (req, res, next) => {

  try {

     // System admin (no church) should skip church context

    const normalizedRole = String(req.user?.role || "").trim().toLowerCase();

    const effectiveRole = normalizedRole === "super_admin" ? "superadmin" : normalizedRole === "support_admin" ? "supportadmin" : normalizedRole;

    // System accounts have no home church — skip the DB lookup for the
    // common church-user path.
    const roleIsSystem = req.user?.church ? false : await isSystemRole(effectiveRole);



    // Delegated sessions: the system admin is viewing as a specific church.
    // The role was overridden to "churchclerkadmin" by attachPermissions, but the
    // admin user has no home church. Treat delegated sessions like superadmin
    // for church scoping (trust the x-active-church header), but enforce that
    // the active church matches the one the delegate token was issued for.
    const isDelegate = Boolean(req.isDelegate);
    const delegateChurchId = req.delegateChurch || null;

    if (!req.user?.church && !roleIsSystem && !isDelegate) {

      req.activeChurch = null;    // explicitly set for dashboard controllers

      return next();

    }



    const headerChurchId = req.headers["x-active-church"];

    const userChurchId = req.user.church;



    let activeChurchId = headerChurchId || userChurchId;

    // Delegated sessions: enforce tenant isolation.
    // The active church must match the one the delegate token was issued for.
    if (isDelegate && delegateChurchId) {
      activeChurchId = delegateChurchId;
    }



    // Branch/Independent users should never switch context via header.

    // If a stale/foreign x-active-church is present, force it back to their home church.

    let userChurch = null;

    if (

      !roleIsSystem &&

      !isDelegate &&

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

      !roleIsSystem &&

      !isDelegate &&

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

    // When a system admin hides the suspension reason, church users must not
    // see it anywhere the church context is exposed.
    if (req.activeChurch.suspendReasonVisible === false) {
      delete req.activeChurch.suspendReason;
    }



    req.activeChurch.canEdit =

      roleIsSystem ||

      isDelegate ||

      req.activeChurch._id.toString() === userChurchId?.toString();



    const subscription = await Subscription.findOne({ church: activeChurchId })

      .populate("plan")

      .populate("pendingPlan")

      .lean();



    req.subscription = subscription || null;



    const now = new Date();

    // A trial only grants trial-level access while it is still within its
    // window — once trialEnd passes it is expired (no grace period; grace
    // applies to paid past_due subscriptions only).
    const isTrial =
      (subscription?.status === "free trial" || subscription?.status === "trialing") &&
      (!subscription?.trialEnd || now <= new Date(subscription.trialEnd));



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



    // Module gating applies to every plan — not only Free Lite. A module
    // the plan doesn't include is "readOnly" when the church has data in
    // it (usage ledger re-scanned at every downgrade), and false (fully
    // blocked) when it was never used.
    const trialUsedSet = new Set(
      Array.isArray(subscription?.trialFeaturesUsed) ? subscription.trialFeaturesUsed : []
    );

    const computeModule = (moduleKey) => {
      if (isTrial) return true;
      if (!effectivePlan) return true;
      const allowed = isFeatureEnabledInPlan(effectivePlan?.features, moduleKey);
      if (allowed) return true;
      return trialUsedSet.has(moduleKey) ? "readOnly" : false;
    };

    const baseModules = {

      Dashboard: featureEnabled("dashboard"),

      Branches: req.activeChurch.type === "Headquarters",

      Members: computeModule("Members"),

      Attendance: computeModule("Attendance"),

      ProgramsEvents: computeModule("ProgramsEvents"),

      Organisations: computeModule("Organisations"),

      Outreach: computeModule("Outreach"),

      MemberCare: computeModule("MemberCare"),

      Announcements: computeModule("Announcements"),

      Tithe: computeModule("Tithe"),

      Budgeting: computeModule("Budgeting"),

      ChurchProjects: computeModule("ChurchProjects"),

      SpecialFunds: computeModule("SpecialFunds"),

      Offerings: computeModule("Offerings"),

      Welfare: computeModule("Welfare"),

      Pledges: computeModule("Pledges"),

      BusinessVentures: computeModule("BusinessVentures"),

      Expenses: computeModule("Expenses"),

      FinancialStatement: computeModule("FinancialStatement"),

      ReportsAnalytics: computeModule("ReportsAnalytics"),

      Billing: true,

      Referrals: true,

      Settings: true,

      support: true

    };



    req.activeChurch.modules = baseModules;



    next();

  } catch (error) {

    next(error);

  }

}

