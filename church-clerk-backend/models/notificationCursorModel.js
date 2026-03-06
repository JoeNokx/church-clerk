import mongoose from "mongoose";

const notificationCursorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lastRunAt: {
      type: Date,
      default: null
    },
    cursor: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("NotificationCursor", notificationCursorSchema);
