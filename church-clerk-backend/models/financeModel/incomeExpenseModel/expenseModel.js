import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
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
        "Electricity",
        "Water",
        "Pastor Support",
        "Charity",
        "Church Project",
        "Salary",
        "Other"
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
    },
    dateSpent: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Expense", expenseSchema);