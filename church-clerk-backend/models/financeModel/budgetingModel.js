import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const budgetItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["expense", "income"],
      default: "expense",
      required: true
    },
    // Expense items pick the module the money goes out through — actuals are
    // counted only from that source. Income items don't use this (the
    // category itself is the income source).
    source: {
      type: String,
      enum: ["general", "program", "cell", "group", "department", "ministry", "organisation", "outreach", "welfare", "project", "business", "other", null],
      default: null
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
    },
    dateFrom: {
      type: Date,
      default: null
    },
    dateTo: {
      type: Date,
      default: null
    },
    allocatedTo: {
      entityType: {
        type: String,
        enum: ["church", "branch", "cell", "group", "department", "ministry", "program", "event", "outreach", "member", "administration", "other", null],
        default: null
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      },
      // Multi-select allocation targets (e.g. several members). entityId stays
      // for single-target allocations.
      entityIds: [{
        type: mongoose.Schema.Types.ObjectId
      }],
      entityName: {
        type: String,
        trim: true,
        default: ""
      }
    },
    // Free-text intent ("Ama's school fees") — record-keeping only on most
    // sources; on Welfare it also matches the disbursement's beneficiaryName.
    purpose: {
      type: String,
      trim: true,
      default: ""
    },
    referenceId: {
      type: String,
      trim: true,
      default: null
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
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
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
      enum: ["upcoming", "current", "ended"],
      default: "upcoming"
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
    },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

budgetingSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("BDG");
  }
});

budgetingSchema.index({ church: 1, fiscalYear: 1, status: 1, createdAt: -1 });

export default mongoose.model("Budget", budgetingSchema);
