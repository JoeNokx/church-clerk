import mongoose from "mongoose";

const systemInAppAnnouncementReceiptSchema = new mongoose.Schema(
  {
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SystemInAppAnnouncement",
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      default: null,
      index: true
    },
    firstSeenAt: {
      type: Date,
      default: null
    },
    lastSeenAt: {
      type: Date,
      default: null
    },
    modalAcknowledgedAt: {
      type: Date,
      default: null
    },
    modalDismissedAt: {
      type: Date,
      default: null
    },
    bannerAcknowledgedAt: {
      type: Date,
      default: null
    },
    bannerDismissedAt: {
      type: Date,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    dismissedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

systemInAppAnnouncementReceiptSchema.index({ announcement: 1, user: 1 }, { unique: true });

export default mongoose.model("SystemInAppAnnouncementReceipt", systemInAppAnnouncementReceiptSchema);
