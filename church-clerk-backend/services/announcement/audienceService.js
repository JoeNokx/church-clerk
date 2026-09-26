import Member from "../../models/memberModel.js";
import GroupMember from "../../models/organisationModel/groupMembersModel.js";
import CellMember from "../../models/organisationModel/cellMembersModel.js";
import DepartmentMember from "../../models/organisationModel/departmentMembersModel.js";
import MinistryMember from "../../models/organisationModel/ministryMembersModel.js";
import ProgramAttendees from "../../models/programModel/programAttendeesModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import mongoose from "mongoose";
import { toObjectIdList } from "../../utils/announcementHelpers.js";

async function distinctMemberIdsForOrganisations({ churchId, groupIds, cellIds, departmentIds, ministryIds }) {
  const [g, c, d, m] = await Promise.all([
    groupIds.length
      ? GroupMember.find({ church: churchId, group: { $in: groupIds } }).distinct("member")
      : Promise.resolve([]),
    cellIds.length
      ? CellMember.find({ church: churchId, cell: { $in: cellIds } }).distinct("member")
      : Promise.resolve([]),
    departmentIds.length
      ? DepartmentMember.find({ church: churchId, department: { $in: departmentIds } }).distinct("member")
      : Promise.resolve([]),
    ministryIds.length
      ? MinistryMember.find({ church: churchId, ministry: { $in: ministryIds } }).distinct("member")
      : Promise.resolve([])
  ]);

  const set = new Set([
    ...(Array.isArray(g) ? g : []),
    ...(Array.isArray(c) ? c : []),
    ...(Array.isArray(d) ? d : []),
    ...(Array.isArray(m) ? m : [])
  ].map((id) => String(id || "")).filter(Boolean));

  return Array.from(set)
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Backward-compatible alias
const distinctMemberIdsForMinistries = ({ churchId, groupIds, cellIds, departmentIds, ministryIds }) =>
  distinctMemberIdsForOrganisations({ churchId, groupIds, cellIds, departmentIds, ministryIds });

function toTrimmedList(value) {
  return (Array.isArray(value) ? value : [])
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

// Audience type "segment": filter members by demographic fields (status, gender,
// age group, marital status) so any member group can be messaged.
function segmentQuery({ churchId, audience }) {
  const q = { church: churchId };
  const statuses = toTrimmedList(audience?.statuses);
  const genders = toTrimmedList(audience?.genders);
  const ageGroups = toTrimmedList(audience?.ageGroups);
  const maritalStatuses = toTrimmedList(audience?.maritalStatuses);
  if (statuses.length) q.status = { $in: statuses };
  if (genders.length) q.gender = { $in: genders };
  if (ageGroups.length) q.ageGroup = { $in: ageGroups };
  if (maritalStatuses.length) q.maritalStatus = { $in: maritalStatuses };
  return q;
}

function hasSegmentFilters(audience) {
  return ["statuses", "genders", "ageGroups", "maritalStatuses"].some((k) => toTrimmedList(audience?.[k]).length);
}

async function countUniqueMembersForAudience({ churchId, audience }) {
  const type = String(audience?.type || "all").trim();

  // Programs: count registered program attendees by phone number.
  // "events"/"eventIds" kept as legacy aliases for drafts saved before the rename.
  if (type === "programs" || type === "events") {
    const programIds = toObjectIdList(audience?.programIds || audience?.eventIds);
    if (!programIds.length) return 0;
    const phones = await ProgramAttendees.distinct("phoneNumber", { church: churchId, event: { $in: programIds } });
    return phones.filter((p) => String(p || "").trim()).length;
  }

  // Outreach: count prospects (optionally scoped to selected outreach events).
  if (type === "outreach") {
    const outreachIds = toObjectIdList(audience?.outreachIds);
    if (!outreachIds.length) return 0;
    const phones = await OutreachProspect.distinct("phone", { church: churchId, outreachEvent: { $in: outreachIds } });
    return phones.filter((p) => String(p || "").trim()).length;
  }

  if (type === "members") {
    const memberIds = toObjectIdList(audience?.memberIds);
    if (!memberIds.length) return 0;
    return await Member.countDocuments({ church: churchId, _id: { $in: memberIds } });
  }

  if (type === "segment") {
    if (!hasSegmentFilters(audience)) return 0;
    return await Member.countDocuments(segmentQuery({ churchId, audience }));
  }

  if (type === "groups") {
    const groupIds = toObjectIdList(audience?.groupIds);
    const cellIds = toObjectIdList(audience?.cellIds);
    const departmentIds = toObjectIdList(audience?.departmentIds);
    const ministryIds = toObjectIdList(audience?.ministryIds);

    if (!groupIds.length && !cellIds.length && !departmentIds.length && !ministryIds.length) return 0;

    const memberIds = await distinctMemberIdsForOrganisations({ churchId, groupIds, cellIds, departmentIds, ministryIds });
    return memberIds.length;
  }

  return await Member.countDocuments({ church: churchId });
}

async function resolveAudienceMembers({ churchId, audience }) {
  const type = String(audience?.type || "all").trim();

  if (type === "members") {
    const memberIds = toObjectIdList(audience?.memberIds);
    if (!memberIds.length) return [];
    return await Member.find({ church: churchId, _id: { $in: memberIds } }).lean();
  }

  if (type === "segment") {
    if (!hasSegmentFilters(audience)) return [];
    return await Member.find(segmentQuery({ churchId, audience })).lean();
  }

  if (type === "groups") {
    const groupIds = toObjectIdList(audience?.groupIds);
    const cellIds = toObjectIdList(audience?.cellIds);
    const departmentIds = toObjectIdList(audience?.departmentIds);
    const ministryIds = toObjectIdList(audience?.ministryIds);

    if (!groupIds.length && !cellIds.length && !departmentIds.length && !ministryIds.length) return [];

    const memberIds = await distinctMemberIdsForOrganisations({ churchId, groupIds, cellIds, departmentIds, ministryIds });
    if (!memberIds.length) return [];
    return await Member.find({ church: churchId, _id: { $in: memberIds } }).lean();
  }

  return await Member.find({ church: churchId }).lean();
}

// Returns a normalized recipient list for every audience type. Member-based
// audiences carry member=<ObjectId>; event attendees and outreach prospects are
// not Member records, so member=null and the delivery stores name/phone only.
async function resolveAudienceRecipients({ churchId, audience }) {
  const type = String(audience?.type || "all").trim();

  if (type === "programs" || type === "events") {
    const programIds = toObjectIdList(audience?.programIds || audience?.eventIds);
    if (!programIds.length) return [];
    const rows = await ProgramAttendees.find({ church: churchId, event: { $in: programIds } }).lean();
    return rows
      .map((r) => ({
        key: String(r?.phoneNumber || r?._id || "").trim(),
        member: null,
        memberName: String(r?.fullName || "").trim(),
        phone: String(r?.phoneNumber || "").trim()
      }))
      .filter((r) => r.phone);
  }

  if (type === "outreach") {
    const outreachIds = toObjectIdList(audience?.outreachIds);
    if (!outreachIds.length) return [];
    const rows = await OutreachProspect.find({ church: churchId, outreachEvent: { $in: outreachIds } }).lean();
    return rows
      .map((r) => {
        const phone = String(r?.phone || r?.alternativePhone || "").trim();
        return {
          key: phone || String(r?._id || ""),
          member: null,
          memberName: `${r?.firstName || ""} ${r?.lastName || ""}`.trim(),
          phone
        };
      })
      .filter((r) => r.phone);
  }

  const members = await resolveAudienceMembers({ churchId, audience });
  return members.map((m) => ({
    key: String(m?._id || ""),
    member: m?._id || null,
    memberName: String(m?.fullName || `${m?.firstName || ""} ${m?.lastName || ""}` || "").trim(),
    phone: String(m?.phoneNumber || "").trim()
  }));
}

export { distinctMemberIdsForOrganisations, distinctMemberIdsForMinistries, countUniqueMembersForAudience, resolveAudienceMembers, resolveAudienceRecipients };
