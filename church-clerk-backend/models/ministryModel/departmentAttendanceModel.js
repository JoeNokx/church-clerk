import mongoose from "mongoose";

const departmentAttendanceSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    date: { type: Date, required: true },
    numberOfAttendees: { type: Number, required: true },
    mainSpeaker: { type: String, trim: true },
    activity: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("departmentTotalAttendance", departmentAttendanceSchema);
