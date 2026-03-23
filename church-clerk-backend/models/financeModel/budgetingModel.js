import mongoose from "mongoose";

const budgetItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["expense", "income"],
      default: "expense",
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const budgetingSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    fiscalYear: {
      type: Number,
      required: true
    },
    periodFrom: {
      type: Date,
      default: null
    },
    periodTo: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft"
    },
    items: {
      type: [budgetItemSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

budgetingSchema.index({ church: 1, fiscalYear: 1, status: 1, createdAt: -1 });

export default mongoose.model("Budget", budgetingSchema);
