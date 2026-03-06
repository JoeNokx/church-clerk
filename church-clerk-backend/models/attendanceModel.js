import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  church: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    trim: true
  },
  serviceDate: {
    type: Date,
    required: true
  },
  serviceTime: {
    type: String,
trim: true
 },
  totalNumber: {
    type: Number,
    required: true,
    min: 0
  },
  mainSpeaker: {
    type: String
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
 
}, 
{timestamps: true}
);

attendanceSchema.index({ church: 1, serviceDate: -1 });
attendanceSchema.index({ church: 1, serviceType: 1, serviceDate: -1 });

export default mongoose.model('Attendance', attendanceSchema);
