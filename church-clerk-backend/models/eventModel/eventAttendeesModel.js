import mongoose from "mongoose";

const eventAttendeesSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  fullName: { type: String, trim: true, required: true },
  email: { type: String, trim: true },
  phoneNumber: { type: String, trim: true, required: true },
  location: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model("EventAttendees", eventAttendeesSchema);
