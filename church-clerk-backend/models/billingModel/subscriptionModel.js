import mongoose from "mongoose";

const normalizeSubscriptionStatus = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (v === "trialing" || v === "free trial" || v === "free  trial") return "free trial";
  if (v === "active") return "active";
  if (v === "past due") return "past_due";
  if (v === "past_due") return "past_due";
  if (v === "suspended") return "suspended";
  if (v === "cancelled" || v === "canceled") return "cancelled";

  return value;
};

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

    pendingPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null
    },

    status: {
      type: String,
      enum: ["free trial", "trialing", "active", "past_due", "suspended", "cancelled"],
      default: "free trial"
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

    paymentMethods: [
      {
        type: {
          type: String,
          enum: ["mobile_money", "card"],
          default: "mobile_money"
        },
        provider: {
          type: String,
          enum: ["mtn", "vod", "tgo"],
          required: function () {
            return this.type === "mobile_money";
          }
        },
        phone: {
          type: String,
          required: function () {
            return this.type === "mobile_money";
          }
        },

        brand: {
          type: String,
          default: null
        },
        last4: {
          type: String,
          default: null
        },
        expMonth: {
          type: Number,
          default: null
        },
        expYear: {
          type: Number,
          default: null
        },
        holderName: {
          type: String,
          default: null
        },
        authorizationCode: {
          type: String,
          default: null
        }
      }
    ],

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

subscriptionSchema.pre("validate", function (next) {
  if (this.status !== undefined && this.status !== null) {
    this.status = normalizeSubscriptionStatus(this.status);
  }
  next();
});

export default mongoose.model("Subscription", subscriptionSchema);
