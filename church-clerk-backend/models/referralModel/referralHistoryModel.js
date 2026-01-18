import mongoose from "mongoose";

const referralHistorySchema = new mongoose.Schema(
  {
    referrerChurch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true
    },

    referredChurch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      unique: true // ⚠️ one referral per church
    },

    referredChurchEmail: {
      type: String,
      required: true
    },

    referredAt: {
      type: Date,
      default: Date.now
    },

    subscribedAt: {
      type: Date,
      default: null
    },

    rewardStatus: {
      type: String,
      enum: ["pending", "rewarded"],
      default: "pending"
    }
  },
  { timestamps: true }
);



export default mongoose.model("ReferralHistory", referralHistorySchema);
