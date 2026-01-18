import mongoose from "mongoose";

const businessIncomeSchema = new mongoose.Schema({
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessVentures: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessVentures", required: true },
    recievedFrom: { type: String, required: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
    amount: { type: Number, required: true }

}, { timestamps: true });

export default mongoose.model("BusinessIncome", businessIncomeSchema);