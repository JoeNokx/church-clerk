import mongoose from "mongoose";

const announcementWalletSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      unique: true,
      index: true
    },
    balanceCredits: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("AnnouncementWallet", announcementWalletSchema);
