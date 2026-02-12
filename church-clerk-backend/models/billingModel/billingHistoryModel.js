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
      enum: ["payment", "free_month", "invoice"],
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
      enum: ["paid", "failed", "pending", "rewarded", "unpaid"],
      required: true
    },

    paymentProvider: {
      type: String,
      enum: ["paystack", "stripe"],
      default: null
    },

    invoiceSnapshot: {
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  planName: String,
  billingInterval: String,
  amount: Number,
  currency: String
},

    invoiceNumber: {
      type: String,
      default: null
    },

    dueDate: {
      type: Date,
      default: null
    },

    providerReference: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("BillingHistory", billingHistorySchema);
