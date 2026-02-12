import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import { validatePlanForChurch } from "../../utils/headquartersPremiumUtils.js";

const planRank = (name) => {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  if (n === "free lite") return 0;
  if (n === "basic") return 1;
  if (n === "standard") return 2;
  if (n === "premium") return 3;
  return 99;
};

export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      church: req.activeChurch._id
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.status = "cancelled";
    subscription.gracePeriodEnd = null;
    subscription.expiryWarning.shown = false;

    await subscription.save();

    return res.json({
      message: "Subscription cancelled successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



export const pauseSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      church: req.activeChurch._id
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.status = "suspended";
    await subscription.save();

    return res.json({ message: "Subscription paused" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const resumeSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      church: req.activeChurch._id
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.status = "active";
    subscription.gracePeriodEnd = null;

    await subscription.save();

    return res.json({ message: "Subscription resumed" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


//change plan

export const changePlan = async (req, res) => {
  try {
    const { newPlanId } = req.body;

    const subscription = await Subscription.findOne({ church: req.activeChurch._id }).populate("plan");

    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) return res.status(404).json({ message: "Plan not found" });

    // validate HQ-only rule
    validatePlanForChurch(req.activeChurch, newPlan);

    subscription.overage = {
      isOverLimit: false,
      startedAt: null,
      graceEndsAt: null
    };

    const currentName = (subscription?.status === "free trial" || subscription?.status === "trialing")
      ? "premium"
      : (subscription?.plan?.name || "free lite");
    const isUpgrade = planRank(newPlan?.name) > planRank(currentName);

    if (isUpgrade) {
      // IMMEDIATE
      subscription.plan = newPlan._id;
      subscription.status = "active";
      subscription.expiryWarning.shown = false;
    } else {
      // DOWNGRADE AT NEXT CYCLE
      subscription.pendingPlan = newPlan._id;
    }

    await subscription.save();

    return res.json({
      message: isUpgrade ? "Plan upgraded successfully" : "Plan downgrade scheduled"
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
