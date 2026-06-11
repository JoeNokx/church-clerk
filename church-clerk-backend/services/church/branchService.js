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
  return kpi;
}

export { getBranchesPaginated, getBranchKPIs };
