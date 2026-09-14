import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

   // Multiple meeting days + times
  meetingSchedule: [
    {
      meetingDay: { type: String, required: true },
      meetingTime: { type: String, required: true },
       meetingVenue: { type: String, trim: true }

    }
  ],     // e.g., '7:00 PM'
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});



groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });


export default mongoose.model('Group', groupSchema);
