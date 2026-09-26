import mongoose from "mongoose";

const totalProgramAttendanceSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },
  date: { type: Date, required: true },
  numberOfAttendees: { type: Number, required: true },
  mainSpeaker: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model("TotalProgramAttendance", totalProgramAttendanceSchema, "totaleventattendances");
