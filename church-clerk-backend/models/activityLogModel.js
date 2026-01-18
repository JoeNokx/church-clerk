import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      enum: [
        "Members",
        "Finance",
        "Attendance",
        "Events",
        "Announcements",
        "Projects",
        "Dashboard",
        "Settings",
        "Authentication",
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Success", "Failed"],
      default: "Success",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);