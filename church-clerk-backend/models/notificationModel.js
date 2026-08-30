import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["payment", "subscription", "trial", "welcome", "impersonation", "system_announcement", "support_ticket"],
      required: true,
      index: true
    },
    actionUrl: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    readStatus: {
      type: Boolean,
      default: false,
      index: true
    },
    dedupeKey: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true
    }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
