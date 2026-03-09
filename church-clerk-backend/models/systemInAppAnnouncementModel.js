import mongoose from "mongoose";

const TARGET_TYPES = ["all", "churches", "roles"];
const DISPLAY_TYPES = ["modal", "banner", "notification"];
const PRIORITIES = ["critical", "informational"];
const STATUSES = ["draft", "sent", "scheduled", "archived"];

const systemInAppAnnouncementSchema = new mongoose.Schema(
  {
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
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "informational",
      index: true
    },
    displayTypes: {
      type: [String],
      default: ["notification"],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((v) => DISPLAY_TYPES.includes(String(v))),
        message: "Invalid displayTypes"
      }
    },
    bannerDurationMinutes: {
      type: Number,
      default: 5,
      min: 0
    },
    target: {
      type: {
        type: String,
        enum: TARGET_TYPES,
        default: "all"
      },
      churchIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Church",
        default: []
      },
      roles: {
        type: [String],
        default: []
      }
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "draft",
      index: true
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true
    },
    sentAt: {
      type: Date,
      default: null,
      index: true
    },
    archivedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

systemInAppAnnouncementSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model("SystemInAppAnnouncement", systemInAppAnnouncementSchema);
