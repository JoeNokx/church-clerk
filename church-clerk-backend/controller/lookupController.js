import LookupValue from "../models/lookupValueModel.js";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const defaultValuesByKind = {
  serviceType: [
    "Sunday Service",
    "Sunday 1st Service",
    "Sunday 2nd Service",
    "Sunday 3rd Service",
    "Sunday 4th Service",
    "Sunday 5th Service",
    "First Sunday Service",
    "Second Sunday Service",
    "Third Sunday Service",
    "1st Service",
    "2nd Service",
    "3rd Service",
    "4th Service",
    "5th Service",
    "Worship Service",
    "Bible Study",
    "Children Service",
    "Midweek Service",
    "Prayer Meeting",
    "Special Program",
    "cells Meeting",
    "groups Meeting",
    "department Meeting"
  ],
  offeringType: ["first offering", "second offering", "third offering", "fourth offering", "fifth offering"],
  eventCategory: [
    "Conference",
    "Service",
    "Worship",
    "Prayers",
    "Outreach",
    "Bible Study",
    "Serminary",
    "Retreat",
    "Workshop",
    "Camp Meeting"
  ],
  specialFundCategory: [
    "Prophetic Seed",
    "Pastor Appreciation",
    "Thanksgiving Offering",
    "Missionary Support",
    "Donation",
    "Retreat",
    "Scholarship Fund"
  ],
  welfareDisbursementCategory: ["Birthday", "Wedding", "Funeral", "Hospital", "Emergency", "School", "Other"],
  expenseCategory: [
    "Maintenance",
    "Equipment",
    "Utilities",
    "Transportation",
    "Pastor Support",
    "Charity",
    "Church Project",
    "Program",
    "Building materials",
    "Salary"
  ],
  businessExpenseCategory: []
};

const uniq = (arr) => {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const s = String(v || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
};

export const listLookupValues = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const kind = String(req.query?.kind || "").trim();
    if (!kind) return res.status(400).json({ message: "kind is required" });

    const defaults = Array.isArray(defaultValuesByKind[kind]) ? defaultValuesByKind[kind] : [];

    const rows = await LookupValue.find({ churchId, kind }).select("value").sort({ value: 1 }).lean();
    const dbValues = rows.map((r) => r?.value).filter(Boolean);

    const values = uniq([...defaults, ...dbValues]).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({ kind, values });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createLookupValue = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const kind = String(req.body?.kind || "").trim();
    const value = String(req.body?.value || "").trim();

    if (!kind) return res.status(400).json({ message: "kind is required" });
    if (!value) return res.status(400).json({ message: "value is required" });

    const normalizedValue = normalizeValue(value);

    const createdBy = req.user?._id || null;

    const doc = await LookupValue.create({
      churchId,
      kind,
      value,
      normalizedValue,
      createdBy
    }).catch(async (e) => {
      if (e?.code === 11000) {
        return await LookupValue.findOne({ churchId, kind, normalizedValue }).lean();
      }
      throw e;
    });

    return res.status(201).json({ message: "Lookup value saved", lookup: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
