import mongoose from 'mongoose';

const welfareDisbursementSchema = new mongoose.Schema({

  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  
beneficiaryName: {
  type: String,
  required: true,
  trim: true
}, 
category: {
  type: String,
  required: true,
  enum: ["Birthday", "Wedding", "Funeral", "Hospital", "Emergency", "School", "Other"],
},
  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  description: { type: String, trim: true },
  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'],
    default: 'Cash'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('WelfareDisbursements', welfareDisbursementSchema);