import Member from "../../models/memberModel.js";
import { validatePhoneNumber } from "../../utils/validatePhoneNumber.js";
import { parseOptionalDate } from "../../utils/memberHelpers.js";

async function validateMemberImportRows({ churchId, rawRows }) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const normalized = rows.map((r) => {
    const firstName = String(r?.firstname || r?.first || "").trim();
    const lastName = String(r?.lastname || r?.last || "").trim();
    const phoneNumberRaw = String(r?.phonenumber || r?.phone || "").trim();
    let phoneNumber = "";
    if (phoneNumberRaw) {
      try {
        phoneNumber = validatePhoneNumber(phoneNumberRaw, "GH");
      } catch {
        phoneNumber = "";
      }
    }
    const email = String(r?.email || "").trim().toLowerCase();
    const gender = String(r?.gender || "").trim().toLowerCase();
    const occupation = String(r?.occupation || "").trim();
    const nationality = String(r?.nationality || "").trim();
    const status = String(r?.status || "").trim().toLowerCase();
    const note = String(r?.note || "").trim();
    const churchRole = String(r?.churchrole || r?.role || "").trim();
    const streetAddress = String(r?.streetaddress || r?.address || "").trim();
    const city = String(r?.city || "").trim();
    const region = String(r?.region || "").trim();
    const country = String(r?.country || "").trim();
    const maritalStatus = String(r?.maritalstatus || "").trim().toLowerCase();
    const dateOfBirthRaw = r?.dateofbirth || r?.dob || "";
    const dateJoinedRaw = r?.datejoined || "";
    return {
      firstName,
      lastName,
      phoneNumber,
      phoneNumberRaw,
      email,
      gender,
      occupation,
      nationality,
      status,
      note,
      churchRole,
      streetAddress,
      city,
      region,
      country,
      maritalStatus,
      dateOfBirthRaw,
      dateJoinedRaw
    };
  });

  const phones = normalized.map((r) => r.phoneNumber).filter(Boolean);
  const emails = normalized.map((r) => r.email).filter(Boolean);

  const existing = await Member.find({
    church: churchId,
    $or: [
      ...(phones.length ? [{ phoneNumber: { $in: phones } }] : []),
      ...(emails.length ? [{ email: { $in: emails } }] : [])
    ]
  })
    .select("phoneNumber email")
    .lean();

  const existingPhones = new Set((existing || []).map((m) => String(m?.phoneNumber || "").trim()).filter(Boolean));
  const existingEmails = new Set((existing || []).map((m) => String(m?.email || "").trim().toLowerCase()).filter(Boolean));

  const seenPhones = new Set();
  const seenEmails = new Set();

  const valid = [];
  const invalid = [];

  normalized.forEach((r, idx) => {
    const rowNumber = idx + 2;
    const reasons = [];

    if (!r.firstName) reasons.push("Missing firstName");
    if (!r.lastName) reasons.push("Missing lastName");
    if (!r.phoneNumberRaw) reasons.push("Missing phoneNumber");

    if (r.gender && !["male", "female"].includes(r.gender)) reasons.push("Invalid gender");
    if (r.status && !["active", "inactive", "visitor", "former"].includes(r.status)) reasons.push("Invalid status");
    if (r.maritalStatus && !["single", "married", "divorced", "widowed", "other"].includes(r.maritalStatus)) {
      reasons.push("Invalid maritalStatus");
    }

    const emailTrimmed = r.email;
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) reasons.push("Invalid email");

    const dob = parseOptionalDate(r.dateOfBirthRaw);
    if (dob.error) reasons.push("Invalid dateOfBirth");
    const joined = parseOptionalDate(r.dateJoinedRaw);
    if (joined.error) reasons.push("Invalid dateJoined");

    if (r.phoneNumberRaw) {
      if (!r.phoneNumber) reasons.push("Invalid phoneNumber");
      if (r.phoneNumber) {
        if (existingPhones.has(r.phoneNumber)) reasons.push("Duplicate phoneNumber (already exists)");
        if (seenPhones.has(r.phoneNumber)) reasons.push("Duplicate phoneNumber (in CSV)");
        seenPhones.add(r.phoneNumber);
      }
    }

    if (r.email) {
      if (existingEmails.has(r.email)) reasons.push("Duplicate email (already exists)");
      if (seenEmails.has(r.email)) reasons.push("Duplicate email (in CSV)");
      seenEmails.add(r.email);
    }

    if (reasons.length) {
      invalid.push({ rowNumber, reasons, data: r });
    } else {
      valid.push(r);
    }
  });

  return { valid, invalid };
}

export { validateMemberImportRows };
