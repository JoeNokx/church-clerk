import mongoose from "mongoose";
import crypto from "crypto";

const savedReportSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    module: {
      type: String,
      required: true,
      trim: true
    },
    moduleLabel: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    columns: {
      type: [{ key: String, label: String }],
      default: []
    },
    rows: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    rowCount: {
      type: Number,
      default: 0
    },
    dateFrom: {
      type: Date,
      default: null
    },
    dateTo: {
      type: Date,
      default: null
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

savedReportSchema.pre("save", function () {
  if (this.isNew && !this.shareToken) {
    this.shareToken = crypto.randomBytes(24).toString("hex");
  }
});

savedReportSchema.index({ church: 1, createdAt: -1 });

export default mongoose.model("SavedReport", savedReportSchema);
