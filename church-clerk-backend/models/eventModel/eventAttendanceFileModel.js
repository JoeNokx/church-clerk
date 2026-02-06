import mongoose from "mongoose";

const eventAttendanceFileSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },

    originalName: { type: String, trim: true, required: true },
    mimeType: { type: String, trim: true, required: true },
    size: { type: Number, required: true },

    url: { type: String, trim: true, required: true },
    publicId: { type: String, trim: true, required: true },
    resourceType: { type: String, trim: true, required: true },
    format: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("EventAttendanceFile", eventAttendanceFileSchema);
