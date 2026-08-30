import mongoose from "mongoose";

const historyEntrySchema = new mongoose.Schema(
  {
    actor: { type: String, enum: ["user", "admin", "system"], default: "system" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, trim: true },
    type: {
      type: String,
      enum: ["created", "status_change", "user_response", "admin_response", "resolved", "closed", "reopened", "rated"],
      required: true
    },
    content: { type: String, trim: true },
    fromStatus: { type: String },
    toStatus: { type: String }
  },
  { timestamps: true }
);

const supportRequestSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, sparse: true, index: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "Other" },
    churchName: { type: String, trim: true },
    name: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church" },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true
    },
    adminNote: { type: String, trim: true },
    history: { type: [historyEntrySchema], default: [] },
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingFeedback: { type: String, trim: true }
  },
  { timestamps: true }
);

supportRequestSchema.index({ submittedBy: 1, createdAt: -1 });

export default mongoose.model("SupportRequest", supportRequestSchema);
