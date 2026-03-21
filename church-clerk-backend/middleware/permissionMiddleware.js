export const requirePermission = (moduleKey, actionKey) => {
  const mod = String(moduleKey || "").trim();
  const action = String(actionKey || "").trim();

  const normalize = (v) => String(v || "").trim();

  const planFeatureForModule = (moduleName) => {
    const m = normalize(moduleName);

    // 1:1 mappings
    if (
      m === "dashboard" ||
      m === "members" ||
      m === "attendance" ||
      m === "announcements" ||
      m === "churchProjects" ||
      m === "specialFunds" ||
      m === "offerings" ||
      m === "welfare" ||
      m === "pledges" ||
      m === "businessVentures" ||
      m === "expenses" ||
      m === "financialStatement" ||
      m === "reportsAnalytics" ||
      m === "billing" ||
      m === "referrals" ||
      m === "settings" ||
      m === "supportHelp"
    ) {
      return m;
    }

    // Aliases / legacy
    if (m === "ministry") return "ministries";
    if (m === "events") return "programsEvents";
    if (m === "tithe") return "tithes";
    if (m === "branches") return "branchesOverview";
    if (m === "support") return "supportHelp";

    // Gate all settings submodules by the main plan 'settings' feature
    if (m.startsWith("settings")) return "settings";
    if (m === "visitors") return null;

    return null;
  };

  const isPlanAllowed = (req, moduleName) => {
    const plan = req?.plan;
    if (!plan) return true;

    const subscription = req?.subscription;
    const isTrial = subscription?.status === "free trial" || subscription?.status === "trialing";
    if (isTrial) return true;

    const featureKey = planFeatureForModule(moduleName);
    if (!featureKey) return true;

    const features = plan?.features || {};

    if (featureKey === "dashboard") return features?.dashboard !== false;
    if (featureKey === "announcements") return Boolean(features?.announcements || features?.announcement);
    if (featureKey === "specialFunds") return Boolean(features?.specialFunds || features?.specialFund);

    return Boolean(features?.[featureKey]);
  };

  return (req, res, next) => {
    const perms = req.permissions || {};

    if (perms?.super) return next();

    const allowedByPlan = isPlanAllowed(req, mod);
    if (!allowedByPlan) {
      return res.status(403).json({
        message: "Your subscription plan does not include access to this module. Please upgrade to continue."
      });
    }

    if (!mod || !action) {
      return res.status(500).json({ message: "Permission middleware misconfigured" });
    }

    const allowed = Boolean(perms?.[mod]?.[action]);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }

    return next();
  };
};
