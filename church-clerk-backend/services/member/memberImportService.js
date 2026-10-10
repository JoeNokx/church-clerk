import Member from "../../models/memberModel.js";
import { validatePhoneNumber } from "../../utils/validatePhoneNumber.js";
import { parseOptionalDate } from "../../utils/memberHelpers.js";
import { MEMBER_IMPORT_FIELDS, memberFieldEnum } from "../../utils/memberImportFields.js";

const pickRaw = (r, f) => {
  let v = r?.[f.raw];
  if ((v === undefined || v === null || v === "") && Array.isArray(f.aliases)) {
    for (const a of f.aliases) {
      if (r?.[a] !== undefined && r?.[a] !== null && r?.[a] !== "") { v = r[a]; break; }
    }
  }
  return v ?? "";
};

async function validateMemberImportRows({ churchId, rawRows }) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const normalized = rows.map((r) => {
    const out = { __rowNumber: r.__rowNumber };
    for (const f of MEMBER_IMPORT_FIELDS) {
      const raw = pickRaw(r, f);
      if (f.kind === "phone") {
        const phoneNumberRaw = String(raw || "").trim();
        out.phoneNumberRaw = phoneNumberRaw;
        out.phoneNumber = "";
        if (phoneNumberRaw) {
          try {
            out.phoneNumber = validatePhoneNumber(phoneNumberRaw, "GH");
          } catch {
            out.phoneNumber = "";
          }
        }
        continue;
      }
      if (f.kind === "date") { out[`${f.key}Raw`] = raw; continue; }
      const s = String(raw ?? "").trim();
      out[f.key] = f.lower ? s.toLowerCase() : s;
    }
    return out;
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
    const rowNumber = Number.isFinite(Number(r.__rowNumber)) ? Number(r.__rowNumber) : idx + 2;
    const reasons = [];

    for (const f of MEMBER_IMPORT_FIELDS) {
      if (f.required) {
        const present = f.kind === "phone" ? Boolean(r.phoneNumberRaw) : Boolean(r[f.key]);
        if (!present) reasons.push(`Missing ${f.key}`);
      }
      if (f.enum) {
        const v = r[f.key];
        const allowed = memberFieldEnum(f.enum);
        if (v && allowed.length && !allowed.includes(v)) {
          reasons.push(`Invalid ${f.key} "${v}" (use: ${allowed.join(", ")})`);
        }
      }
    }

    const emailTrimmed = r.email;
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      reasons.push(`Invalid email "${r.email}"`);
    }

    const dob = parseOptionalDate(r.dateOfBirthRaw);
    if (dob.error) reasons.push(`Invalid dateOfBirth "${r.dateOfBirthRaw}" (use YYYY-MM-DD)`);
    const joined = parseOptionalDate(r.dateJoinedRaw);
    if (joined.error) reasons.push(`Invalid dateJoined "${r.dateJoinedRaw}" (use YYYY-MM-DD)`);

    const merged = { ...r };
    for (const f of MEMBER_IMPORT_FIELDS) {
      if (f.kind === "date") {
        merged[f.key] = f.key === "dateOfBirth" ? (dob.date || null) : (joined.date || undefined);
      }
    }
    delete merged.__rowNumber;
    const payload = Object.fromEntries(
      Object.entries(merged).map(([k, v]) => [k, v === "" ? undefined : v])
    );

    if (r.phoneNumberRaw) {
      if (!r.phoneNumber) reasons.push(`Invalid phoneNumber "${r.phoneNumberRaw}"`);
      if (r.phoneNumber) {
        if (existingPhones.has(r.phoneNumber)) reasons.push(`Duplicate phoneNumber "${r.phoneNumberRaw}" (already exists)`);
        if (seenPhones.has(r.phoneNumber)) reasons.push(`Duplicate phoneNumber "${r.phoneNumberRaw}" (in file)`);
        seenPhones.add(r.phoneNumber);
      }
    }

    if (r.email) {
      if (existingEmails.has(r.email)) reasons.push(`Duplicate email "${r.email}" (already exists)`);
      if (seenEmails.has(r.email)) reasons.push(`Duplicate email "${r.email}" (in file)`);
      seenEmails.add(r.email);
    }

    if (reasons.length) {
      invalid.push({ rowNumber, reasons, payload });
    } else {
      valid.push({ rowNumber, payload });
    }
  });

  return { valid, invalid };
}

export { validateMemberImportRows };
