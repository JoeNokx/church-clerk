import Member from "../models/memberModel.js"
import Church from "../models/churchModel.js"
import Visitor from "../models/visitorsModel.js"

import GroupMember from "../models/ministryModel/groupMembersModel.js"
import { checkAndHandleMemberLimit } from "../utils/memberLimitUtils.js";

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsvLine(line) {
  const s = String(line ?? "");
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      const next = s[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((v) => String(v ?? "").trim());
}

function parseCsvToObjects(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines = rawLines.map((l) => String(l || "").trim()).filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const headerParts = parseCsvLine(lines[0]);
  const headers = headerParts.map(normalizeHeader);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      obj[key] = parts[j] ?? "";
    }
    rows.push(obj);
  }

  return { headers, rows };
}

function parseOptionalDate(value) {
  const v = String(value || "").trim();
  if (!v) return { date: null, error: null };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { date: null, error: "Invalid date" };
  return { date: d, error: null };
}

async function getChurchPrefix(churchId) {
  const church = await Church.findById(churchId).lean();
  if (!church) return null;

  const prefix = String(church?.name || "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, "")[0])
    .filter(Boolean)
    .map((ch) => ch.toUpperCase())
    .join("");

  return prefix || "CH";
}

async function validateMemberImportRows({ churchId, rawRows }) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const normalized = rows.map((r) => {
    const firstName = String(r?.firstname || r?.first || "").trim();
    const lastName = String(r?.lastname || r?.last || "").trim();
    const phoneNumber = String(r?.phonenumber || r?.phone || "").trim();
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
    if (!r.phoneNumber) reasons.push("Missing phoneNumber");

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

    if (r.phoneNumber) {
      if (existingPhones.has(r.phoneNumber)) reasons.push("Duplicate phoneNumber (already exists)");
      if (seenPhones.has(r.phoneNumber)) reasons.push("Duplicate phoneNumber (in file)");
    }
    if (emailTrimmed) {
      if (existingEmails.has(emailTrimmed)) reasons.push("Duplicate email (already exists)");
      if (seenEmails.has(emailTrimmed)) reasons.push("Duplicate email (in file)");
    }

    if (reasons.length) {
      invalid.push({ rowNumber, reasons, row: r });
      return;
    }

    if (r.phoneNumber) seenPhones.add(r.phoneNumber);
    if (emailTrimmed) seenEmails.add(emailTrimmed);

    valid.push({
      rowNumber,
      payload: {
        firstName: r.firstName,
        lastName: r.lastName,
        phoneNumber: r.phoneNumber,
        email: emailTrimmed || undefined,
        gender: r.gender || undefined,
        occupation: r.occupation || undefined,
        nationality: r.nationality || undefined,
        status: r.status || "active",
        note: r.note || undefined,
        dateOfBirth: dob.date || undefined,
        churchRole: r.churchRole || undefined,
        dateJoined: joined.date || undefined,
        streetAddress: r.streetAddress || undefined,
        city: r.city || undefined,
        region: r.region || undefined,
        country: r.country || undefined,
        maritalStatus: r.maritalStatus || undefined
      }
    });
  });

  return { valid, invalid };
}

const downloadMembersImportTemplate = async (req, res) => {
  try {
    const headers = [
      "firstName",
      "lastName",
      "phoneNumber",
      "email",
      "gender",
      "occupation",
      "nationality",
      "status",
      "dateOfBirth",
      "churchRole",
      "dateJoined",
      "streetAddress",
      "city",
      "region",
      "country",
      "maritalStatus",
      "note"
    ];

    const example = [
      "John",
      "Doe",
      "0240000000",
      "john@example.com",
      "male",
      "Teacher",
      "Ghanaian",
      "active",
      "1990-01-15",
      "Member",
      "2025-01-05",
      "",
      "Accra",
      "Greater Accra",
      "Ghana",
      "single",
      ""
    ];

    const csv = `${headers.join(",")}\n${example.map((v) => `\"${String(v || "").replace(/\"/g, "\"\"")}\"`).join(",")}\n`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"members-import-template.csv\"");
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ message: "Failed to download template", error: error.message });
  }
};

const previewMembersImport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Church context not found" });

    const file = req.file;
    if (!file?.buffer) return res.status(400).json({ message: "CSV file is required" });

    const text = file.buffer.toString("utf8");
    const { rows } = parseCsvToObjects(text);
    if (!rows.length) {
      return res.status(400).json({ message: "CSV has no data rows" });
    }

    const result = await validateMemberImportRows({ churchId, rawRows: rows });

    return res.status(200).json({
      message: "Preview generated",
      summary: {
        total: rows.length,
        valid: result.valid.length,
        invalid: result.invalid.length
      },
      validRows: result.valid.slice(0, 200),
      invalidRows: result.invalid.slice(0, 200)
    });
  } catch (error) {
    return res.status(400).json({ message: "Failed to preview import", error: error.message });
  }
};

const importMembersCsv = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    const createdBy = req.user?._id;
    if (!churchId) return res.status(400).json({ message: "Church context not found" });
    if (!createdBy) return res.status(401).json({ message: "Unauthorized" });

    const file = req.file;
    if (!file?.buffer) return res.status(400).json({ message: "CSV file is required" });

    const text = file.buffer.toString("utf8");
    const { rows } = parseCsvToObjects(text);
    if (!rows.length) {
      return res.status(400).json({ message: "CSV has no data rows" });
    }

    const { valid, invalid } = await validateMemberImportRows({ churchId, rawRows: rows });
    if (!valid.length) {
      return res.status(400).json({
        message: "No valid rows to import",
        summary: { total: rows.length, imported: 0, skipped: invalid.length },
        invalidRows: invalid.slice(0, 500)
      });
    }

    const prefix = await getChurchPrefix(churchId);
    if (!prefix) return res.status(404).json({ message: "Church not found" });

    const updatedChurch = await Church.findByIdAndUpdate(
      churchId,
      { $inc: { memberSerial: valid.length } },
      { new: true }
    );
    if (!updatedChurch) return res.status(404).json({ message: "Church not found" });

    const lastSerial = Number(updatedChurch.memberSerial || 0);
    const startSerial = lastSerial - valid.length + 1;

    const created = [];
    const skipped = [...invalid];

    for (let i = 0; i < valid.length; i++) {
      const serial = startSerial + i;
      const paddedNumber = String(serial).padStart(6, "0");
      const memberId = `${prefix}-${paddedNumber}`;

      const payload = valid[i]?.payload || {};
      try {
        const doc = await Member.create({
          memberId,
          ...payload,
          createdBy,
          church: churchId
        });
        created.push({ rowNumber: valid[i].rowNumber, member: doc });
      } catch (e) {
        skipped.push({
          rowNumber: valid[i].rowNumber,
          reasons: [e?.message || "Insert failed"],
          row: payload
        });
      }
    }

    const totalMembers = await Member.countDocuments({ church: churchId });
    await Church.findByIdAndUpdate(churchId, { memberCount: totalMembers });

    await checkAndHandleMemberLimit({
      churchId,
      totalMembers
    });

    return res.status(201).json({
      message: "Import completed",
      summary: {
        total: rows.length,
        imported: created.length,
        skipped: skipped.length
      },
      importedRows: created.slice(0, 200),
      invalidRows: skipped.slice(0, 500)
    });
  } catch (error) {
    return res.status(400).json({ message: "Failed to import members", error: error.message });
  }
};

const createMember = async (req, res) => {
  try {
    const { firstName, lastName, email, visitorId, phoneNumber, gender, occupation, nationality, status, note, dateOfBirth, churchRole, dateJoined, streetAddress, city, region, country, maritalStatus, department, group: groupIds, cell } = req.body;

    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({ message: "first name, last name and phone number are required" })
    }

    const churchId = req.activeChurch?._id;
    const createdBy = req.user._id;

    if (!churchId) {
      return res.status(400).json({ message: "Church context not found" });
    }

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }

    const prefix = church.name
      .trim()
      .split(/\s+/)             // split by spaces
      .map(word => word.replace(/[^a-zA-Z]/g, "")[0].toUpperCase()) // remove non-letters, take first letter
      .join("");

    const updatedChurch = await Church.findByIdAndUpdate(
      churchId,
      { $inc: { memberSerial: 1 } },
      { new: true }
    );

    const paddedNumber = String(updatedChurch.memberSerial || 0).padStart(6, "0");
    const memberId = `${prefix}-${paddedNumber}`;

    let member;
    try {
      member = await Member.create({
        memberId,     //auto-generated
        firstName,
        lastName,
        email,
        phoneNumber,
        gender,
        occupation,
        nationality,
        status,
        note,
        dateOfBirth,
        churchRole,
        dateJoined,
        visitorId: visitorId || null,   // store visitorId if sent
        streetAddress,
        city,
        region,
        country,
        maritalStatus,
        department,
        cell,
        group: groupIds || [], 
        createdBy,
        church: churchId
      });
    } catch (error) {
      throw error;
    }

    if (visitorId) {
      await Visitor.findByIdAndUpdate(visitorId, {
        status: "converted",
      });
    }

    if (groupIds && groupIds.length > 0) {
      await Promise.all(groupIds.map(groupId => 
        GroupMember.create({
          group: groupId,
          member: member._id,
          role: "Member",
          church: member.church,
          createdBy: req.user._id
        })
      ));
    }

    const totalMembers = await Member.countDocuments({
      church: req.activeChurch._id
    });

    await Church.findByIdAndUpdate(req.activeChurch._id, {
      memberCount: totalMembers
    });

    await checkAndHandleMemberLimit({
      churchId: req.activeChurch._id,
      totalMembers
    });

    return res.status(201).json({ message: "member created successfully", member })
  } catch (error) {
    return res.status(400).json({ message: "member could not be created", error: error.message })
  }
}

const getAllMembers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      dateFrom,
      dateTo,
      status, // active | inactive
    } = req.query;

    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return res.status(400).json({ message: "Invalid dateFrom" });
    }

    if (dateTo && isNaN(Date.parse(dateTo))) {
      return res.status(400).json({ message: "Invalid dateTo" });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const baseQuery = { church: req.activeChurch._id }

    const query = { ...baseQuery };

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { phoneNumber: regex },
        { email: regex },
        { city: regex },
        { memberId: regex }
      ];
    }

    if (status && status !== "all") {
      query.status = status; // "active" or "inactive"
    }

    if (dateFrom || dateTo) {
      query.dateJoined = {};

      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        query.dateJoined.$gte = startDate;
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.dateJoined.$lte = endDate;
      }
    }

    const members = await Member.find(query)
      .sort({ createdAt: -1 })
      .select("firstName lastName phoneNumber email dateJoined createdAt churchRole city status")
      .skip(skip)
      .limit(limitNum);

    const totalMembers = await Member.countDocuments(query);

    const totalPages = Math.ceil(totalMembers / limitNum);
    const pagination = {
      totalResult: totalMembers,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    if (!members || members.length === 0) {
      return res.status(200).json({
        message: "No members found.",
        pagination: {
          totalResult: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null,
        },
        count: 0,
        members: []
      });
    }

    return res.status(200).json({
      message: "members retrieved successfully", 
      pagination,
      count: members.length,
      members
    })
  } catch (error) {
    return res.status(400).json({ message: "member could not be fetched", error: error.message })
  }
}

const getSingleMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const query = { _id: memberId, church: req.activeChurch._id }

    const member = await Member.findOne(query)
      .populate("church", "name")
      .populate("cell", "name role status")
      .populate("group", "name role status")
      .populate("department", "name role status")

    const memberStatus = member.status;

    if (!member) {
      return res.status(404).json({ message: "member not found" })
    }

    return res.status(200).json({
      message: "Member retrieved successfully",
      member,
      memberStatus: memberStatus
    });
  } catch (error) {
    return res.status(400).json({ message: "member could not be created", error: error.message })
  }
}

const updateMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const query = { _id: memberId, church: req.activeChurch._id }

    const member = await Member.findOneAndUpdate(query, req.body, { new: true, runValidators: true })

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    return res.status(200).json({
      message: "member updated successfully",
      member
    })
  } catch (error) {
    return res.status(400).json({ message: "member could not be updated", error: error.message })
  }
}

const deleteMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const query = { _id: memberId, church: req.activeChurch._id }

    const member = await Member.findOneAndDelete(query);

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const totalMembers = await Member.countDocuments({
      church: req.activeChurch._id
    });

    await Church.findByIdAndUpdate(req.activeChurch._id, {
      memberCount: totalMembers
    });

    return res.status(200).json({
      message: "member deleted successfully",
      member
    })
  } catch (error) {
    return res.status(400).json({ message: "member could not be deleted", error: error.message })
  }
}

const getAllMembersKPI = async (req, res) => {
  try {
    const query = { church: req.activeChurch._id };

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const [
      totalMembers,
      currentMembers,
      inactiveMembers,
      newMembersThisMonth
    ] = await Promise.all([
      Member.countDocuments(query),
      Member.countDocuments({ ...query, status: "active" }),
      Member.countDocuments({ ...query, status: "inactive" }),
      Member.countDocuments({
        ...query,
        createdAt: { $gte: startOfMonth }
      })
    ]);

    return res.status(200).json({
      message: "Member KPI fetched successfully",
      memberKPI: {
        totalMembers,
        currentMembers,
        inactiveMembers,
        newMembersThisMonth
      }
    });
  } catch (error) {
    return res.status(400).json({
      message: "Member KPI could not be fetched",
      error: error.message
    });
  }
};

export {
  createMember,
  getAllMembers,
  getSingleMember,
  updateMember,
  deleteMember,
  getAllMembersKPI,
  downloadMembersImportTemplate,
  previewMembersImport,
  importMembersCsv
}