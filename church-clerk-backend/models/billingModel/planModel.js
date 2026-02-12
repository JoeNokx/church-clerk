import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: String,

    memberLimit: {
      type: Number, // 100, 500, null for unlimited
      default: null
    },

    features: {
      financeModule: { type: Boolean, default: false },
      announcements: { type: Boolean, default: false },

      // PEOPLE & MINISTRIES
      members: { type: Boolean, default: false },
      attendance: { type: Boolean, default: false },
      programsEvents: { type: Boolean, default: false },
      ministries: { type: Boolean, default: false },
      announcement: { type: Boolean, default: false },

      // FINANCE
      tithes: { type: Boolean, default: false },
      specialFund: { type: Boolean, default: false },
      offerings: { type: Boolean, default: false },
      welfare: { type: Boolean, default: false },
      pledges: { type: Boolean, default: false },
      businessVentures: { type: Boolean, default: false },
      expenses: { type: Boolean, default: false },
      financialStatement: { type: Boolean, default: false },

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
      GHS: { monthly: Number, halfYear: Number, yearly: Number },
      NGN: { monthly: Number, halfYear: Number, yearly: Number },
      USD: { monthly: Number, halfYear: Number, yearly: Number }
    },

    priceByCurrency: {
      GHS: { monthly: Number, halfYear: Number, yearly: Number },
      NGN: { monthly: Number, halfYear: Number, yearly: Number },
      USD: { monthly: Number, halfYear: Number, yearly: Number }
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
