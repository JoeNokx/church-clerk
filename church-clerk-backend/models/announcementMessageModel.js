import mongoose from "mongoose";

const announcementMessageSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    channels: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => (Array.isArray(arr) ? arr.every((c) => ["sms"].includes(String(c))) : false),
        message: "Invalid channels"
      }
    },
    smsSenderId: {
      type: String,
      default: null,
      trim: true
    },
    sender_id_used: {
      type: String,
      default: null,
      trim: true
    },
    status: {
      type: String,
      enum: ["draft", "sent", "scheduled", "processing", "cancelled", "failed"],
      default: "draft",
      index: true
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    audience: {
      type: Object,
      default: null
    },
    recipientCount: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    sentCount: {
      type: Number,
      default: 0
    },
    pendingCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    },
    costPerRecipientCredits: {
      type: Number,
      default: 0
    },
    totalCostCredits: {
      type: Number,
      default: 0
    },
    // Hybrid SMS billing fields
    segmentsPerMessage: {
      type: Number,
      default: 0
    },
    deductionKey: {
      type: String,
      default: null,
      index: true
    },
    fromIncludedCredits: {
      type: Number,
      default: 0
    },
    fromWalletCredits: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("AnnouncementMessage", announcementMessageSchema);
