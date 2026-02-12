import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";

const isPlanAllowedForModule = ({ moduleKey, planName }) => {
  if (moduleKey === "finance") {
    return planName === "standard" || planName === "premium";
  }

  if (moduleKey === "reports") {
    return planName === "premium";
  }

  if (moduleKey === "branches") {
    return planName === "premium";
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

      let planName = "basic";

      if (subscription.status === "free trial" || subscription.status === "trialing") {
        planName = "premium";
      } else if (subscription.plan) {
        const plan = await Plan.findById(subscription.plan).lean();
        planName = plan?.name || "basic";
      }

      const allowed = isPlanAllowedForModule({ moduleKey, planName });

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
