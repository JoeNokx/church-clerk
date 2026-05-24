import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: String,

    paystackPlanCodes: {
      hourly:    { type: String, default: null },
      daily:     { type: String, default: null },
      weekly:    { type: String, default: null },
      monthly:   { type: String, default: null },
      quarterly: { type: String, default: null },
      halfYear:  { type: String, default: null },
      yearly:    { type: String, default: null }
    },

    memberLimit: {
      type: Number, // 100, 500, null for unlimited
      default: null
    },

    userLimit: {
      type: Number,
      default: null
    },

    features: {
      financeModule: { type: Boolean, default: false },
      announcements: { type: Boolean, default: false },

      dashboard: { type: Boolean, default: true },
      branchesOverview: { type: Boolean, default: false },

      // PEOPLE & MINISTRIES
      members: { type: Boolean, default: false },
      attendance: { type: Boolean, default: false },
      programsEvents: { type: Boolean, default: false },
      ministries: { type: Boolean, default: false },
      announcement: { type: Boolean, default: false },

      // FINANCE
      tithes: { type: Boolean, default: false },
      budgeting: { type: Boolean, default: false },
      specialFund: { type: Boolean, default: false },
      specialFunds: { type: Boolean, default: false },
      offerings: { type: Boolean, default: false },
      welfare: { type: Boolean, default: false },
      pledges: { type: Boolean, default: false },
      businessVentures: { type: Boolean, default: false },
      expenses: { type: Boolean, default: false },
      financialStatement: { type: Boolean, default: false },
      churchProjects: { type: Boolean, default: false },

      // ADMINISTRATION
      reportsAnalytics: { type: Boolean, default: false },
      billing: { type: Boolean, default: false },
      referrals: { type: Boolean, default: false },
      settings: { type: Boolean, default: false },
      supportHelp: { type: Boolean, default: false }
    },

    featureCategories: {
      peopleMinistries: { type: Boolean, default: false },
      finance: { type: Boolean, default: false },
      administration: { type: Boolean, default: false }
    },

    // HQ restriction
    hqOnly: {
      type: Boolean,
      default: false
    },

    // Pricing per country & interval
    pricing: {
      GHS: { hourly: Number, daily: Number, weekly: Number, monthly: Number, quarterly: Number, halfYear: Number, yearly: Number },
      NGN: { hourly: Number, daily: Number, weekly: Number, monthly: Number, quarterly: Number, halfYear: Number, yearly: Number },
      USD: { hourly: Number, daily: Number, weekly: Number, monthly: Number, quarterly: Number, halfYear: Number, yearly: Number }
    },

    priceByCurrency: {
      GHS: { hourly: Number, daily: Number, weekly: Number, monthly: Number, quarterly: Number, halfYear: Number, yearly: Number },
      NGN: { hourly: Number, daily: Number, weekly: Number, monthly: Number, quarterly: Number, halfYear: Number, yearly: Number },
      USD: { hourly: Number, daily: Number, weekly: Number, monthly: Number, quarterly: Number, halfYear: Number, yearly: Number }
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
