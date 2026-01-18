import mongoose from "mongoose";

const referralCodeSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      unique: true
    },

    code: {
      type: String,
      required: true,
      unique: true
    },

    totalFreeMonthsEarned: { type: Number, default: 0 },
    totalFreeMonthsUsed: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("ReferralCode", referralCodeSchema);
