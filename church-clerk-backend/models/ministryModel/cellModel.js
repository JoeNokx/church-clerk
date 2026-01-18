// models/Cell.js
import mongoose from "mongoose";

const cellSchema = new mongoose.Schema({
   church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    mainMeetingDay: { type: String },         // e.g., 'Thursday'
    meetingTime: { type: String },        // e.g., '7:00 PM'
    meetingVenue: { type: String },
    members: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        role: { type: String, default: 'Member' }
      }
    ],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});


export default mongoose.model('Cell', cellSchema);
