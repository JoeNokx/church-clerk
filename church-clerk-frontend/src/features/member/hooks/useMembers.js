import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMember as apiCreateMember,
  deleteMember as apiDeleteMember,
  getMembers as apiGetMembers,
  getMembersKPI as apiGetMembersKPI,
  updateMember as apiUpdateMember
} from "../services/member.api.js";

export const memberQueryKeys = {
  membersPrefix: (churchId) => ["members", String(churchId || "")],
  members: (churchId, filters) => [
    "members",
    String(churchId || ""),
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || ""),
    String(filters?.status || "all"),
    String(filters?.dateFrom || ""),
    String(filters?.dateTo || "")
  ],
  kpi: (churchId) => ["members", "kpi", String(churchId || "")]
};

function buildMembersParams(filters) {
  const next = filters || {};

  const params = {
    page: next.page,
    limit: next.limit
  };

  if (next.search) params.search = next.search;
  if (next.status && next.status !== "all") params.status = next.status;
  if (next.dateFrom) params.dateFrom = next.dateFrom;
  if (next.dateTo) params.dateTo = next.dateTo;

  return params;
}

export function useMembersListQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: memberQueryKeys.members(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildMembersParams(filters);
      const res = await apiGetMembers(params, { signal });
      const payload = res?.data?.data ?? res?.data;
      return payload || {};
    }
  });
}

export function useMembersKpiQuery({ activeChurchId, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: memberQueryKeys.kpi(churchId),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const res = await apiGetMembersKPI({ signal });
      const payload = res?.data?.data ?? res?.data;
      return payload?.memberKPI || payload || null;
    }
  });
}

export function useMemberMutations(activeChurchId) {
  const queryClient = useQueryClient();
  const churchId = activeChurchId || "";

  const invalidateMembers = async () => {
    if (!churchId) return;
    await queryClient.invalidateQueries({
      queryKey: memberQueryKeys.membersPrefix(churchId),
      exact: false
    });
  };

  const createMember = useMutation({
    mutationFn: async (payload) => {
      return await apiCreateMember(payload);
    },
    onSuccess: invalidateMembers
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiUpdateMember(id, payload);
    },
    onSuccess: invalidateMembers
  });

  const deleteMember = useMutation({
    mutationFn: async (id) => {
      return await apiDeleteMember(id);
    },
    onSuccess: invalidateMembers
  });

  return {
    createMember,
    updateMember,
    deleteMember,
    invalidateMembers
  };
}
