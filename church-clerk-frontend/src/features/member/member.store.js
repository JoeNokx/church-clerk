import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { memberQueryKeys, useMemberMutations, useMembersListQuery } from "./hooks/useMembers.js";
import ChurchContext from "../church/church.store.js";

const MemberContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyFilters = {
  page: 1,
  limit: 10,
  search: "",
  status: "all",
  dateFrom: "",
  dateTo: ""
};

export function MemberProvider({ children }) {
  const [filters, setFiltersState] = useState(emptyFilters);

  const queryClient = useQueryClient();

  const churchStore = useContext(ChurchContext);
  const [activeChurch, setActiveChurch] = useState(null);

  useEffect(() => {
    const churchId = churchStore?.activeChurch?._id || null;
    setActiveChurch(churchId);
  }, [churchStore?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const membersQuery = useMembersListQuery({
    activeChurchId: activeChurch,
    filters,
    enabled: true
  });

  const mutations = useMemberMutations(activeChurch);

  const membersPayload = membersQuery?.data || {};
  const members = Array.isArray(membersPayload?.members) ? membersPayload.members : [];
  const pagination = membersPayload?.pagination || emptyPagination;

  const error =
    membersQuery?.error?.response?.data?.message ||
    membersQuery?.error?.message ||
    null;

  const loading = Boolean(
    membersQuery?.isLoading ||
      mutations?.createMember?.isPending ||
      mutations?.updateMember?.isPending ||
      mutations?.deleteMember?.isPending
  );

  const fetchMembers = useCallback(
    async (partial) => {
      if (!activeChurch) return;

      const patch = partial || {};
      const keys = Object.keys(patch);
      if (keys.length === 0) {
        await queryClient.invalidateQueries({
          queryKey: memberQueryKeys.membersPrefix(activeChurch),
          exact: false
        });
        return;
      }

      setFiltersState((prev) => ({ ...prev, ...patch }));
    },
    [activeChurch, queryClient]
  );

  const createMember = useCallback(
    async (payload) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await mutations.createMember.mutateAsync(payload);
    },
    [activeChurch, mutations.createMember]
  );

  const updateMember = useCallback(
    async (id, payload) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await mutations.updateMember.mutateAsync({ id, payload });
    },
    [activeChurch, mutations.updateMember]
  );

  const deleteMember = useCallback(
    async (id) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await mutations.deleteMember.mutateAsync(id);
    },
    [activeChurch, mutations.deleteMember]
  );

  const value = useMemo(() => {
    return {
      members,
      pagination,
      filters,
      loading,
      error,
      activeChurch,
      setFilters,
      fetchMembers,
      createMember,
      updateMember,
      deleteMember
    };
  }, [members, pagination, filters, loading, error, activeChurch, setFilters, fetchMembers, createMember, updateMember, deleteMember]);

  return createElement(
    MemberContext.Provider,
    {
      value
    },
    children
  );
}

export default MemberContext;
