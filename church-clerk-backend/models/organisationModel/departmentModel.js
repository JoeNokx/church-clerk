// models/Cell.js
import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
   church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },

    meetingSchedule: [
      {
        meetingDay: { type: String, trim: true },
        meetingTime: { type: String, trim: true },
        meetingVenue: { type: String, trim: true }
      }
    ],

    mainMeetingDay: { type: String },         // e.g., 'Thursday'
    meetingTime: { type: String },        // e.g., '7:00 PM'
    meetingVenue: { type: String },
    roles: {type: String, enum: ['Leader', 'Member'], default: 'Member'},
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


export default mongoose.model('Department', departmentSchema);
