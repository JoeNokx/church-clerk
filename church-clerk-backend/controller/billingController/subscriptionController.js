import { createSubscriptionForChurch, upgradeTrialToPlans, runBillingCycles } from "./subscriptionService.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";


export const chooseSubscription = async (req, res) => {
  try {
    const {
      churchId,
      planId = null,
      trial = false,
      currency = "GHS",
      billingInterval = "monthly",
      billingCycle
    } = req.body;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }

    const subscription = await createSubscriptionForChurch({
      church,
      planId,
      trial,
      currency,
      billingInterval: billingCycle || billingInterval
    });

    res.status(201).json({
      message: "Subscription created successfully",
      subscriptionId: subscription._id,
      status: subscription.status
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ church: req.activeChurch._id })
      .populate("plan")
      .lean();

    if (!subscription)
      return res.status(404).json({ message: "No subscription found" });

    const now = new Date();

    const isTrialExpired =
      subscription.status === "trialing" &&
      subscription.trialEnd &&
      now > new Date(subscription.trialEnd);

    const isGraceExpired =
      subscription.status === "past_due" &&
      subscription.gracePeriodEnd &&
      now > new Date(subscription.gracePeriodEnd);

    const effectivePlan = subscription.status === "trialing"
      ? await Plan.findOne({ name: { $regex: /^premium$/i }, isActive: true }).lean()
      : subscription.plan;

    const readOnly = Boolean(
      isTrialExpired ||
        subscription.status === "suspended" ||
        isGraceExpired
    );

    res.json({
      subscription,
      effectivePlan: effectivePlan || subscription.plan || null,
      readOnly
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const upgradeTrialToPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const church = await Church.findById(req.user.church);
    if (!church) return res.status(404).json({ message: "Church not found" });

    const subscription = await upgradeTrialToPlans(church, planId);

    res.json({
      message: "Trial upgraded to plan successfully",
      subscriptionId: subscription._id,
      status: subscription.status
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const runBillingCycle = async (req, res) => {
  try {
    await runBillingCycles();
    res.json({ message: "Billing cycle executed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAvailablePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ createdAt: 1 }).lean();
    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
