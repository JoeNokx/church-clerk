import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["basic", "standard", "premium"],
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
      announcements: { type: Boolean, default: false }
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

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
