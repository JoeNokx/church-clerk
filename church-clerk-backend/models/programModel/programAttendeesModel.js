import mongoose from "mongoose";

const programAttendeesSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },
  fullName: { type: String, trim: true, required: true },
  email: { type: String, trim: true },
  phoneNumber: { type: String, trim: true, required: true },
  location: { type: String, trim: true },
  registrationDate: { type: Date, default: Date.now },
  registeredInAdvance: { type: Boolean, default: false },
  present: { type: Boolean, default: true },
  attendeeType: { type: String, enum: ["member", "guest"], default: "member" },
  heardAbout: { type: String, trim: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor" },
}, { timestamps: true });

export default mongoose.model("ProgramAttendees", programAttendeesSchema, "eventattendees");
