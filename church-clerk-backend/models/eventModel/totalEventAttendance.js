import mongoose from "mongoose";

const totalEventAttendanceSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  date: { type: Date, required: true },
  numberOfAttendees: { type: Number, required: true },
  mainSpeaker: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model("TotalEventAttendance", totalEventAttendanceSchema);
