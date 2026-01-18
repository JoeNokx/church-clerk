import mongoose from 'mongoose';

const pledgeSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  name: { type: String }, 
  phoneNumber: { type: String, trim: true },
  serviceType: { type: String, enum:['Sunday Service', '1st Service', '2nd Service', '3rd Service', 'Special Program', 'Worship Service', 'Bible Study', 'Special Program', 'Children Service', 'Midweek Service', 'Prayer Meeting'] },
  amount: { type: Number, required: true },
  pledgeDate: { type: Date, required: true },
  deadline: { type: Date },
  note: { type: String, trim: true },
  status: { type: String, enum: ['In Progress', 'Completed'], default: 'In Progress' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Pledge', pledgeSchema);