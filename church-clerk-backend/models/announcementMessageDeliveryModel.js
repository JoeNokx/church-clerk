import mongoose from "mongoose";

const announcementMessageDeliverySchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      index: true
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnnouncementMessage",
      required: true,
      index: true
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
      index: true
    },
    memberName: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    channel: {
      type: String,
      enum: ["sms"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
      index: true
    },
    provider: {
      type: String,
      default: null
    },
    providerMessageId: {
      type: String,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    lastCallbackStatus: {
      type: String,
      default: null
    },
    lastCallbackAt: {
      type: Date,
      default: null
    },
    attemptNumber: {
      type: Number,
      default: 1
    },
    resendOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnnouncementMessageDelivery",
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("AnnouncementMessageDelivery", announcementMessageDeliverySchema);
