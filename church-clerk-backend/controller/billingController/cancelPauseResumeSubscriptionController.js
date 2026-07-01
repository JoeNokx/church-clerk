import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";
import { validatePlanForChurch } from "../../utils/headquartersPremiumUtils.js";
import {
  sendCancellationScheduledEmail,
  sendDowngradeScheduledEmail
} from "../../utils/subscriptionEmails.js";

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
    if (req.activeChurch.type === "Headquarters") {
      return res.status(400).json({
        message: "Headquarters churches cannot cancel their Premium subscription."
      });
    }

    const subscription = await Subscription.findOne({
      church: req.activeChurch._id
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const freeLite = await Plan.findOne({ name: { $regex: /^free\s*lite$/i } }).lean();

    if (!freeLite?._id) {
      return res.status(404).json({ message: "Free Lite plan not found" });
    }

    subscription.pendingPlan = freeLite._id;
    subscription.pendingPlanEffectiveDate = subscription.nextBillingDate;
    subscription.pendingPlanAction = "cancel";

    await subscription.save();

    try {
      const church = await Church.findById(subscription.church).lean();
      await sendCancellationScheduledEmail(church, subscription.nextBillingDate);
    } catch { /* email failure must not abort cancellation */ }

    return res.json({
      message: "Cancellation scheduled",
      pendingPlanEffectiveDate: subscription.pendingPlanEffectiveDate
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



export const undoCancellation = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ church: req.activeChurch._id });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (subscription.pendingPlanAction !== "cancel") {
      return res.status(400).json({ message: "No pending cancellation to undo" });
    }

    subscription.pendingPlan = null;
    subscription.pendingPlanEffectiveDate = null;
    subscription.pendingPlanAction = null;

    await subscription.save();

    return res.json({ message: "Cancellation undone. Your subscription will continue as normal." });
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

    if (!isUpgrade && req.activeChurch.type === "Headquarters") {
      return res.status(400).json({
        message: "Headquarters churches must remain on the Premium plan and cannot downgrade."
      });
    }

    if (isUpgrade) {
      // IMMEDIATE
      subscription.plan = newPlan._id;
      subscription.pendingPlan = null;
      subscription.pendingPlanEffectiveDate = null;
      subscription.pendingPlanAction = null;
      subscription.status = "active";
      subscription.expiryWarning.shown = false;
    } else {
      // DOWNGRADE AT NEXT CYCLE
      subscription.pendingPlan = newPlan._id;
      subscription.pendingPlanEffectiveDate = subscription.nextBillingDate;
      subscription.pendingPlanAction = "downgrade";
    }

    await subscription.save();

    if (!isUpgrade) {
      try {
        const church = await Church.findById(subscription.church).lean();
        await sendDowngradeScheduledEmail(
          church,
          currentName,
          newPlan.name,
          subscription.pendingPlanEffectiveDate
        );
      } catch { /* email failure must not abort downgrade */ }
    }

    return res.json({
      message: isUpgrade ? "Plan upgraded successfully" : "Plan downgrade scheduled",
      pendingPlanEffectiveDate: isUpgrade ? null : subscription.pendingPlanEffectiveDate
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
