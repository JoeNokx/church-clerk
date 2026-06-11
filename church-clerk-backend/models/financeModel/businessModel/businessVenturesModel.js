import mongoose from "mongoose";

const businessVenturesSchema = new mongoose.Schema({
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessName: { type: String, required: true },
    description: { type: String, trim: true },
    manager: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },

    startDate: { type: Date, required: true, default: Date.now }

}, { timestamps: true });

businessVenturesSchema.index({ church: 1, startDate: 1 });

export default mongoose.model("BusinessVentures", businessVenturesSchema);