import mongoose from 'mongoose';

const financialStatementSchema = new mongoose.Schema({
  church: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true
  },
  type: {
    type: String,
    enum: ['Monthly', 'Annual'],
    required: true
  },
  periodStart: Date,
  periodEnd: Date,
  totalIncome: Number,
  totalExpenses: Number,
  surplus: Number,
  incomeDetails: [
    {
      category: String,
      amount: Number
    }
  ],
  expenseDetails: [
    {
      category: String,
      amount: Number
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('FinancialStatement', financialStatementSchema);
