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
    enum: [
      'Sunday Service',
      'Sunday 1st Service',
      'Sunday 2nd Service',
      'Sunday 3rd Service',
      'Sunday 4th Service',
      'Sunday 5th Service',
      'Special Program',
      'Worship Service',
      'Bible Study',
      'Children Service',
      'Midweek Service',
      'Prayer Meeting'
    ]
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

export default mongoose.model('Attendance', attendanceSchema);
