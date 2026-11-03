import OpeningBalance from "../../models/financeModel/openingBalanceModel.js";

const ACCOUNT_TYPES = ["Cash", "Bank", "Mobile Money", "Other"];

const cleanBreakdown = (breakdown) =>
  Array.isArray(breakdown)
    ? breakdown
        .filter((b) => b && String(b.source || "").trim() && Number(b.amount) > 0)
        .map((b) => ({ source: String(b.source).trim(), amount: Number(b.amount) }))
    : [];

const validatePayload = (body) => {
  const { accountName, accountType, balanceAsOf, amount, confirmed } = body || {};
  if (!accountName || !String(accountName).trim()) return "Account name is required";
  if (!ACCOUNT_TYPES.includes(accountType)) return "Valid account type is required";
  if (!balanceAsOf) return "Balance as of date is required";
  const total = Number(amount);
  if (!Number.isFinite(total) || total < 0) return "Valid amount is required";
  const breakdown = cleanBreakdown(body.breakdown);
  const breakdownTotal = breakdown.reduce((s, b) => s + b.amount, 0);
  if (breakdownTotal > total) {
    return "Breakdown amounts cannot exceed the account balance";
  }
  if (!confirmed) return "Please confirm the details are true before saving";
  return null;
};

const getOpeningBalances = async (req, res) => {
  try {
    const accounts = await OpeningBalance.find({ church: req.activeChurch._id })
      .populate("createdBy", "fullName")
      .populate("history.changedBy", "fullName")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ accounts });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createOpeningBalance = async (req, res) => {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const doc = await OpeningBalance.create({
      church: req.activeChurch._id,
      accountName: String(req.body.accountName).trim(),
      accountType: req.body.accountType,
      balanceAsOf: req.body.balanceAsOf,
      amount: Number(req.body.amount),
      breakdown: cleanBreakdown(req.body.breakdown),
      note: req.body.note ? String(req.body.note).trim() : "",
      confirmed: true,
      createdBy: req.user._id
    });

    return res.status(201).json({ message: "Account added", account: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateOpeningBalance = async (req, res) => {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const doc = await OpeningBalance.findOne({ _id: req.params.id, church: req.activeChurch._id });
    if (!doc) return res.status(404).json({ message: "Account not found" });

    // Snapshot the previous values into history before overwriting.
    doc.history.push({
      accountName: doc.accountName,
      accountType: doc.accountType,
      balanceAsOf: doc.balanceAsOf,
      amount: doc.amount,
      breakdown: doc.breakdown,
      note: doc.note,
      changedBy: req.user._id
    });

    doc.accountName = String(req.body.accountName).trim();
    doc.accountType = req.body.accountType;
    doc.balanceAsOf = req.body.balanceAsOf;
    doc.amount = Number(req.body.amount);
    doc.breakdown = cleanBreakdown(req.body.breakdown);
    doc.note = req.body.note ? String(req.body.note).trim() : "";
    doc.confirmed = true;
    await doc.save();

    const populated = await OpeningBalance.findById(doc._id)
      .populate("createdBy", "fullName")
      .populate("history.changedBy", "fullName")
      .lean();
    return res.status(200).json({ message: "Account updated", account: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export { getOpeningBalances, createOpeningBalance, updateOpeningBalance };
