import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    userName: {
      type: String,
      trim: true,
      default: ""
    },
    userRole: {
      type: String,
      trim: true,
      default: ""
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: false,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      trim: true,
      default: ""
    },
    httpMethod: {
      type: String,
      trim: true,
      default: ""
    },
    path: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
    },
    browser: {
      type: String,
      trim: true,
      default: ""
    },
    os: {
      type: String,
      trim: true,
      default: ""
    },
    deviceType: {
      type: String,
      trim: true,
      default: ""
    },
    model: {
      type: String,
      trim: true,
      default: ""
    },
    userAgent: {
      type: String,
      trim: true,
      default: ""
    },
    responseStatusCode: {
      type: Number,
      default: 0
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