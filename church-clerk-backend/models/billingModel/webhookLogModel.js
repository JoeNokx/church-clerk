import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["paystack"],
      required: true
    },
    eventType: {
      type: String,
      default: null
    },
    reference: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["received", "processed", "failed", "rejected"],
      default: "received"
    },
    errorMessage: {
      type: String,
      default: null
    },
    headers: {
      type: Object,
      default: null
    },
    payload: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("WebhookLog", webhookLogSchema);
