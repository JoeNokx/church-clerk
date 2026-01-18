import mongoose from 'mongoose';

const titheAggregateSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, trim: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('TitheAggregate', titheAggregateSchema);