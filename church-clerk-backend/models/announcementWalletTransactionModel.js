import mongoose from "mongoose";

const announcementWalletTransactionSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      index: true
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnnouncementWallet",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["fund", "deduct", "refund", "adjust"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "success"
    },
    amountCredits: {
      type: Number,
      required: true
    },
    balanceAfterCredits: {
      type: Number,
      default: null
    },
    description: {
      type: String,
      default: ""
    },
    provider: {
      type: String,
      enum: ["paystack"],
      default: null
    },
    providerReference: {
      type: String,
      default: null,
      index: true
    },
    metadata: {
      type: Object,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("AnnouncementWalletTransaction", announcementWalletTransactionSchema);
