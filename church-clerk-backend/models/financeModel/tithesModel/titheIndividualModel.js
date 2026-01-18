import mongoose from 'mongoose';

const titheIndividualSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  payerName: { type: String }, // If not a member

  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque', 'Card'],
    required: 'true'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('TitheIndividual', titheIndividualSchema);