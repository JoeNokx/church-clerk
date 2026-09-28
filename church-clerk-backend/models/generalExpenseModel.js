import mongoose from "mongoose";
import { generateReferenceId } from "../utils/generateReferenceId.js";

const generalExpenseSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
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
    },
    // Optional scope — expenses recorded under an organisation unit or program
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    cell: { type: mongoose.Schema.Types.ObjectId, ref: "Cell" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    ministry: { type: mongoose.Schema.Types.ObjectId, ref: "Ministry" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  {
    timestamps: true,
  }
);

generalExpenseSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("EXP");
  }
});

export default mongoose.model("GeneralExpenses", generalExpenseSchema);