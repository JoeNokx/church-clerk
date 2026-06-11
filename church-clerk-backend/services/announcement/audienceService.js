import Member from "../../models/memberModel.js";
import GroupMember from "../../models/ministryModel/groupMembersModel.js";
import CellMember from "../../models/ministryModel/cellMembersModel.js";
import DepartmentMember from "../../models/ministryModel/departmentMembersModel.js";
import mongoose from "mongoose";
import { toObjectIdList } from "../../utils/announcementHelpers.js";

async function distinctMemberIdsForMinistries({ churchId, groupIds, cellIds, departmentIds }) {
  const [g, c, d] = await Promise.all([
    groupIds.length
      ? GroupMember.find({ church: churchId, group: { $in: groupIds } }).distinct("member")
      : Promise.resolve([]),
    cellIds.length
      ? CellMember.find({ church: churchId, cell: { $in: cellIds } }).distinct("member")
      : Promise.resolve([]),
    departmentIds.length
      ? DepartmentMember.find({ church: churchId, department: { $in: departmentIds } }).distinct("member")
      : Promise.resolve([])
  ]);

  const set = new Set([
    ...(Array.isArray(g) ? g : []),
    ...(Array.isArray(c) ? c : []),
    ...(Array.isArray(d) ? d : [])
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

    if (!groupIds.length && !cellIds.length && !departmentIds.length) return 0;

    const memberIds = await distinctMemberIdsForMinistries({ churchId, groupIds, cellIds, departmentIds });
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

    if (!groupIds.length && !cellIds.length && !departmentIds.length) return [];

    const memberIds = await distinctMemberIdsForMinistries({ churchId, groupIds, cellIds, departmentIds });
    if (!memberIds.length) return [];
    return await Member.find({ church: churchId, _id: { $in: memberIds } }).lean();
  }

  return await Member.find({ church: churchId }).lean();
}

export { distinctMemberIdsForMinistries, countUniqueMembersForAudience, resolveAudienceMembers };
