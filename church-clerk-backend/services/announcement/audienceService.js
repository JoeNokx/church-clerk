import Member from "../../models/memberModel.js";
import GroupMember from "../../models/organisationModel/groupMembersModel.js";
import CellMember from "../../models/organisationModel/cellMembersModel.js";
import DepartmentMember from "../../models/organisationModel/departmentMembersModel.js";
import MinistryMember from "../../models/organisationModel/ministryMembersModel.js";
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

async function countUniqueMembersForAudience({ churchId, audience }) {
  const type = String(audience?.type || "all").trim();

  if (type === "members") {
    const memberIds = toObjectIdList(audience?.memberIds);
    if (!memberIds.length) return 0;
    return await Member.countDocuments({ church: churchId, _id: { $in: memberIds } });
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

export { distinctMemberIdsForOrganisations, distinctMemberIdsForMinistries, countUniqueMembersForAudience, resolveAudienceMembers };
