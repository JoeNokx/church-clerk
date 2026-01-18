import { createSubscriptionForChurch, upgradeTrialToPlans, runBillingCycles } from "./subscriptionService.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Church from "../../models/churchModel.js";


export const chooseSubscription = async (req, res) => {
  try {
    const {
      churchId,
      planId = null,
      trial = false,
      currency = "GHS",
      billingCycle = "monthly"
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
      billingCycle
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
    const subscription = await Subscription.findOne({ church: req.user.church })
      .populate("plan")
      .lean();

    if (!subscription)
      return res.status(404).json({ message: "No subscription found" });

    res.json({ subscription });
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


