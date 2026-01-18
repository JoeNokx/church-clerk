import mongoose from 'mongoose';


const projectExpenseSchema = new mongoose.Schema({
  churchProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ChurchProject', required: true },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

 spentOn: { type: String, trim: true, required: true },
  amount: { type: Number, required: true },
  description: { type: String, trim: true },
  date: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('ProjectExpense', projectExpenseSchema);