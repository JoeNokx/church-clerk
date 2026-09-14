import mongoose from "mongoose";

const ministryAttendanceSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ministry: { type: mongoose.Schema.Types.ObjectId, ref: "Ministry", required: true },
    date: { type: Date, required: true },
    numberOfAttendees: { type: Number, required: true },
    mainSpeaker: { type: String, trim: true },
    activity: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("ministryTotalAttendance", ministryAttendanceSchema);
