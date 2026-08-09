import mongoose from "mongoose";
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const businessVenturesSchema = new mongoose.Schema({
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessName: { type: String, required: true },
    description: { type: String, trim: true },
    manager: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },

    startDate: { type: Date, required: true, default: Date.now },
    referenceId: { type: String, unique: true, sparse: true, index: true }

}, { timestamps: true });

businessVenturesSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("BIZ");
  }
});

businessVenturesSchema.index({ church: 1, startDate: 1 });

export default mongoose.model("BusinessVentures", businessVenturesSchema);