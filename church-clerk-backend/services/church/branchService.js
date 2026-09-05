import Church from "../../models/churchModel.js";
import { buildPaginationParams, buildPaginationResponse } from "../../utils/paginationHelper.js";
import { buildSearchQuery } from "../../utils/searchHelper.js";

async function getBranchesPaginated({ churchId, search, page, limit }) {
  const { skip } = buildPaginationParams({ page, limit });

  const baseQuery = {
    parentChurch: churchId
  };

  const query = { ...baseQuery };

  if (search) {
    const searchFields = ["name", "pastor", "streetAddress", "city", "region", "country"];
    Object.assign(query, buildSearchQuery(search, searchFields));
  }

  const branches = await Church.find(query)
    .select("name pastor streetAddress city region country phoneNumber email memberCount")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalBranches = await Church.countDocuments(query);
  const pagination = buildPaginationResponse(totalBranches, page, limit);

  return { branches, totalBranches, pagination };
}

async function getBranchKPIs({ churchId }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const baseKpiAgg = await Church.aggregate([
    { $match: { parentChurch: churchId } },
    {
      $group: {
        _id: null,
        totalBranches: { $sum: 1 },
        totalMembers: { $sum: "$memberCount" }
      }
    }
  ]);

  const kpi = baseKpiAgg[0] || { totalBranches: 0, totalMembers: 0 };

  // Previous-month snapshots for change/diff
  const [branchesLastMonthAgg, membersLastMonthAgg] = await Promise.all([
    Church.countDocuments({ parentChurch: churchId, createdAt: { $lt: startOfMonth } }),
    Church.aggregate([
      { $match: { parentChurch: churchId, createdAt: { $lt: startOfMonth } } },
      { $group: { _id: null, totalMembers: { $sum: "$memberCount" } } }
    ]),
  ]);

  const totalMembersLastMonth = membersLastMonthAgg[0]?.totalMembers || 0;

  const pctChange = (current, previous) => {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (!p) return c ? 100 : 0;
    return ((c - p) / p) * 100;
  };

  const branchesThisMonth = await Church.countDocuments({
    parentChurch: churchId,
    createdAt: { $gte: startOfMonth }
  });

  return {
    ...kpi,
    change: {
      totalBranches: pctChange(kpi.totalBranches, branchesLastMonthAgg),
      totalMembers: pctChange(kpi.totalMembers, totalMembersLastMonth),
    },
    diff: {
      totalBranches: kpi.totalBranches - branchesLastMonthAgg,
      totalMembers: kpi.totalMembers - totalMembersLastMonth,
    },
  };
}

export { getBranchesPaginated, getBranchKPIs };
