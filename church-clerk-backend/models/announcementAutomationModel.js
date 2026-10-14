import mongoose from "mongoose";

const announcementAutomationSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    // "birthday"        → daily check for members whose birthday is today
    // "weekly_reminder" → recurring send on the selected day(s) of the week
    // "daily"           → every day at sendTime
    // "monthly"         → same day of each month (clamped to month length)
    // "one_time"        → once on runDate at sendTime, then auto-disables
    type: {
      type: String,
      enum: ["birthday", "weekly_reminder", "daily", "monthly", "one_time"],
      required: true
    },
    // Calendar date for one_time automations — "YYYY-MM-DD" (local).
    runDate: {
      type: String,
      default: null,
      trim: true
    },
    // Day of month (1-31) for monthly automations — months shorter than the
    // day run on their last day instead.
    dayOfMonth: {
      type: Number,
      default: null
    },
    enabled: {
      type: Boolean,
      default: true
    },
    // Message title shown in the Sent Messages list.
    title: {
      type: String,
      required: true,
      trim: true
    },
    // Message body. Supports {firstName}, {lastName}, {fullName} placeholders.
    content: {
      type: String,
      required: true,
      trim: true
    },
    // Days of week for weekly_reminder (0 = Sunday … 6 = Saturday).
    // Ignored for birthday automations, which run every day.
    daysOfWeek: {
      type: [Number],
      default: []
    },
    // Local time of day to send, "HH:mm" 24h.
    sendTime: {
      type: String,
      default: "08:00",
      trim: true
    },
    // Audience for weekly_reminder. Birthday automations always target
    // members whose birthday falls on the run day.
    audience: {
      type: Object,
      default: () => ({ type: "all" })
    },
    lastRunAt: { type: Date, default: null },
    lastRunKey: { type: String, default: null },
    nextRunAt: { type: Date, default: null, index: true },
    lastRunStatus: { type: String, default: null },
    lastRunError: { type: String, default: null },
    lastRunRecipientCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("AnnouncementAutomation", announcementAutomationSchema);
