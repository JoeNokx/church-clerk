import mongoose from 'mongoose';

const specialFundSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  category: {
    type: String,
    enum: [
      'Prophetic Seed',
      'Pastor Appreciation',
      'Thanksgiving Offering',
      'Missionary Support',
      'Donation',
      'Retreat',
      'Scholarship Fund'
    ],
    required: true 
  },
giverName: { type: String, trim: true },
  
  totalAmount: { type: Number, required: true },
  description: { type: String, trim: true },

  givingDate: { type: Date, required: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('SpecialFund', specialFundSchema);