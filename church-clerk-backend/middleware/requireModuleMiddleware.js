import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";

const isPlanAllowedForModule = ({ moduleKey, subscription, plan }) => {
  const normalizedModule = String(moduleKey || "").trim().toLowerCase();
  const status = String(subscription?.status || "").trim().toLowerCase();
  const isTrial = status === "free trial" || status === "trialing";
  if (isTrial) return true;

  const features = plan?.features || {};

  if (normalizedModule === "finance") {
    return Boolean(
      features?.financeModule ||
        features?.tithes ||
        features?.specialFunds ||
        features?.specialFund ||
        features?.offerings ||
        features?.welfare ||
        features?.pledges ||
        features?.businessVentures ||
        features?.expenses ||
        features?.financialStatement ||
        features?.churchProjects
    );
  }

  if (normalizedModule === "reports") {
    return Boolean(features?.reportsAnalytics);
  }

  if (normalizedModule === "branches") {
    return Boolean(features?.branchesOverview);
  }

  return true;
};

export const requireModule = (moduleKey) => {
  return async (req, res, next) => {
    try {
      const churchId = req.activeChurch?._id || req.user?.church;
      if (!churchId) return next();

      const subscription = await Subscription.findOne({ church: churchId }).lean();
      if (!subscription) return next();

      const plan = subscription.plan ? await Plan.findById(subscription.plan).lean() : null;
      const allowed = isPlanAllowedForModule({ moduleKey, subscription, plan });

      if (!allowed) {
        return res.status(403).json({
          message: "Your subscription plan does not include access to this module. Please upgrade to continue."
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
};
