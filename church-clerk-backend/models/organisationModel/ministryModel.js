import mongoose from "mongoose";

const ministrySchema = new mongoose.Schema({
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

    mainMeetingDay: { type: String },
    meetingTime: { type: String },
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


export default mongoose.model('Ministry', ministrySchema);
