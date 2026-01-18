import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      unique: true
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: false
    },

    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "suspended", "cancelled"],
      default: "trialing"
    },

    trialStart: Date,
    trialEnd: Date,

    billingInterval: {
      type: String,
      enum: ["monthly", "halfYear", "yearly"],
      default: "monthly"
    },

    nextBillingDate: {
      type: Date,
      required: true
    },

    currency: {
      type: String,
      enum: ["GHS", "NGN", "USD"],
      default: "GHS",
      required: true
    },

    paymentProvider: {
      type: String,
      enum: ["paystack", "stripe"],
      required: true
    },

    expiryWarning: {
      shown: { type: Boolean, default: false },
      lastNotifiedAt: Date
    },

    gracePeriodEnd: {
      type: Date,
      default: null
    },

    overage: {
  isOverLimit: { type: Boolean, default: false },
  startedAt: Date,
  graceEndsAt: Date
},

    freeMonths: {
      earned: { type: Number, default: 0 },
      used: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
