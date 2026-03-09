import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "singleton"
    },
    trialDays: {
      type: Number,
      default: 14
    },
    gracePeriodDays: {
      type: Number,
      default: 7
    },
    creditsPerGhs: {
      type: Number,
      default: 100,
      min: 1
    },
    smsCostCredits: {
      type: Number,
      default: 5,
      min: 0
    },
    whatsappCostCredits: {
      type: Number,
      default: 20,
      min: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
