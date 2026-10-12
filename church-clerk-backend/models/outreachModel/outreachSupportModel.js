import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const outreachSupportSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachEvent", required: true },

    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor" },
    name: { type: String, trim: true },

    amount: { type: Number, required: true },
    date: { type: Date, required: true },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Mobile Money", "Bank Transfer", "Cheque"],
      default: "Cash"
    },

    note: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

outreachSupportSchema.pre("validate", function () {
  if (!this.member && !this.visitor && !String(this.name || "").trim()) {
    this.invalidate("name", "A member, visitor, or name is required");
  }
});

outreachSupportSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("OSP");
  }
});

outreachSupportSchema.index({ church: 1, event: 1, date: -1 });

export default mongoose.model("OutreachSupport", outreachSupportSchema);
