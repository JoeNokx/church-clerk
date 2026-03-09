import mongoose from "mongoose";

const announcementTemplateSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      enum: ["sms", "whatsapp"],
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

announcementTemplateSchema.index({ church: 1, name: 1 }, { unique: true });

export default mongoose.model("AnnouncementTemplate", announcementTemplateSchema);
