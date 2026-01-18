import mongoose from "mongoose";

const generalExpenseSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Maintenance",
        "Equipment",
        "Utilities",
        "Transportation",
        "Pastor Support",
        "Charity",
        "Church Project",
        "Program",
        "Building materials",
        "Salary"
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Mobile Money", "Bank Transfer", "Cheque"],
      default: "Cash",
      required: true
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("GeneralExpenses", generalExpenseSchema);