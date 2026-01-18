import mongoose from 'mongoose';

const welfareContributionSchema = new mongoose.Schema({

  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },

  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'],
    default: 'Cash'
  }, 

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('WelfareContributions', welfareContributionSchema);