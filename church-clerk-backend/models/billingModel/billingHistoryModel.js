import mongoose from "mongoose";

const billingHistorySchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true
    },

    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true
    },

    type: {
      type: String,
      enum: ["payment", "free_month"],
      required: true
    },

    amount: {
      type: Number,
      default: 0
    },

    currency: {
      type: String,
      enum: ["GHS", "NGN", "USD"]
    },

    status: {
      type: String,
      enum: ["paid", "failed", "pending", "rewarded"],
      required: true
    },

    paymentProvider: {
      type: String,
      enum: ["paystack", "stripe"],
      default: null
    },

    invoiceSnapshot: {
  planName: String,
  billingInterval: String,
  amount: Number,
  currency: String
},

    providerReference: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("BillingHistory", billingHistorySchema);
