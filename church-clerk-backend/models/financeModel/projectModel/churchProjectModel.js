import mongoose from 'mongoose';

const churchProjectSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  description: { type: String },

  startDate: { type: Date, required: true, default: Date.now },

  status: { 
    type: String, 
    enum: ['Active', 'Completed'], 
    default: 'Active' 
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

churchProjectSchema.index({ church: 1, startDate: 1 });

export default mongoose.model('ChurchProject', churchProjectSchema);