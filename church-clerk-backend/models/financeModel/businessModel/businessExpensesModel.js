import mongoose from "mongoose";

const businessExpensesSchema = new mongoose.Schema({
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessVentures: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessVentures", required: true },
    spentBy: { type: String, required: true },
    category: { type: String, trim: true },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true }

}, { timestamps: true });

export default mongoose.models.BusinessExpenses || mongoose.model("BusinessExpenses", businessExpensesSchema);