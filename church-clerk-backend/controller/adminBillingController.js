import Plan from "../models/billingModel/planModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";

const normalizePriceByCurrency = (body) => {
  const priceByCurrency = body?.priceByCurrency || body?.pricing;
  if (!priceByCurrency) return null;
  return priceByCurrency;
};

export const createPlan = async (req, res) => {
  try {
    const { name, description, memberLimit = null, features = {}, isActive = true } = req.body;
    const priceByCurrency = normalizePriceByCurrency(req.body);

    const normalizedName = typeof name === "string" ? name.trim().toLowerCase() : name;

    if (!normalizedName || !priceByCurrency) {
      return res.status(400).json({ message: "Plan name and priceByCurrency are required" });
    }

    const existingPlan = await Plan.findOne({ name: normalizedName });
    if (existingPlan) {
      return res.status(400).json({ message: "Plan already exists" });
    }

    const plan = await Plan.create({
      name: normalizedName,
      description,
      memberLimit,
      features,
      isActive,
      priceByCurrency,
      pricing: priceByCurrency,
      createdBy: req.user._id
    });

    return res.status(201).json({ message: "Plan created successfully", plan });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    return res.status(200).json({ message: "Plans fetched successfully", plans });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim().toLowerCase();
    }

    const priceByCurrency = normalizePriceByCurrency(req.body);
    if (priceByCurrency) {
      updates.priceByCurrency = priceByCurrency;
      updates.pricing = priceByCurrency;
    }

    delete updates.createdBy;

    const plan = await Plan.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    return res.status(200).json({ message: "Plan updated", plan });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    return res.status(200).json({ message: "Plan deleted", plan });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate("church plan").sort({ createdAt: -1 });
    return res.status(200).json({ message: "Subscriptions fetched successfully", subscriptions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
