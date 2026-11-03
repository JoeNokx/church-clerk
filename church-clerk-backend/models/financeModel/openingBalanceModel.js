import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

// Optional per-source breakdown of the account balance — source names
// the money-in module the funds came from.
const breakdownEntrySchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

// Snapshot of the account's previous values each time it's edited —
// audit trail so an old figure is never silently overwritten.
const historyEntrySchema = new mongoose.Schema(
  {
    accountName: String,
    accountType: String,
    balanceAsOf: Date,
    amount: Number,
    breakdown: [breakdownEntrySchema],
    note: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const openingBalanceSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      index: true
    },
    accountName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ["Cash", "Bank", "Mobile Money", "Other"],
      required: true
    },
    balanceAsOf: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 }, // total balance
    breakdown: [breakdownEntrySchema],
    note: { type: String, trim: true, default: "" },
    confirmed: { type: Boolean, default: false },
    history: [historyEntrySchema],
    referenceId: { type: String, unique: true, sparse: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

openingBalanceSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("OPB");
  }
});

export default mongoose.model("OpeningBalance", openingBalanceSchema);
