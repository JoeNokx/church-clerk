import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Member from "../models/memberModel.js";



// GET all churches in system
const getAllChurches = async (req, res) => {
  try {
    const churches = await Church.find().lean();
    res.status(200).json({
      message: "All churches fetched successfully",
      data: churches,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// GET all users in system (superadmin + supportadmin)
const getAllSystemUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ["superadmin","supportadmin"] } })
      .select("-password")
      .lean();

    res.status(200).json({
      message: "System users fetched successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// GET dashboard stats for superadmin
const getDashboardStats = async (req, res) => {
  try {
    const totalChurches = await Church.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalUsers = await User.countDocuments();

    res.status(200).json({
      message: "Dashboard stats fetched successfully",
      data: {
        totalChurches,
        totalMembers,
        totalUsers
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



import Subscription from "../models/billingModel/subscriptionModel.js";
import BillingHistory from "../models/billingModel/billingHistoryModel.js";

export const adminBillingDashboard = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [subscriptions, revenue] = await Promise.all([
      Subscription.find().populate("church plan"),
      BillingHistory.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: "$currency", total: { $sum: "$amount" } } }
      ])
    ]);

    return res.json({
      totalChurches: subscriptions.length,
      active: subscriptions.filter(s => s.status === "active").length,
      pastDue: subscriptions.filter(s => s.status === "past_due").length,
      cancelled: subscriptions.filter(s => s.status === "cancelled").length,
      revenue
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


import Plan from "../models/billingModel/planModel.js";

export const createPlan = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      name,
      description,
      memberLimit = null,
      features = {},
      hqOnly = false,
      pricing
    } = req.body;

    if (!name || !pricing?.GHS?.monthly) {
      return res.status(400).json({
        message: "Plan name and GHS monthly price are required"
      });
    }

    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ message: "Plan already exists" });
    }

    const plan = await Plan.create({
      name,
      description,
      memberLimit,
      features,
      hqOnly,
      pricing
    });

    return res.status(201).json({
      message: "Plan created successfully",
      plan
    });
  } catch (error) {
    return res.status(400).json({
      message: "Plan could not be created",
      error: error.message
    });
  }
};



// GET /api/plans

export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })

    return res.status(200).json({
      message: "Plans fetched successfully",
      plans
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// Update plan
export const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan updated", plan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Delete plan
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan deleted", plan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export { getAllChurches, getAllSystemUsers, getDashboardStats };