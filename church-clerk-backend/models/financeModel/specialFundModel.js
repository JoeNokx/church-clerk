import mongoose from 'mongoose';

const specialFundSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  category: {
    type: String,
    required: true,
    trim: true
  },
  giverName: { type: String, trim: true },
  
  totalAmount: { type: Number, required: true },
  description: { type: String, trim: true },

  givingDate: { type: Date, required: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

specialFundSchema.index({ church: 1, givingDate: 1 });

export default mongoose.model('SpecialFund', specialFundSchema);