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
      default: 3
    }
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
