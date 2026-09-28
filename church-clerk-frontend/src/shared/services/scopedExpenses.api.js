import http from "./http.js";

const SCOPE_BASE = {
  group: "/organisations/groups",
  cell: "/organisations/cells",
  department: "/organisations/departments",
  ministry: "/organisations/ministries",
  program: "/program/programs"
};

const baseFor = (scope, id) => `${SCOPE_BASE[scope]}/${id}/expenses`;

export const getScopedExpenses = async (scope, id, params) => {
  return await http.get(baseFor(scope, id), { params });
};

export const createScopedExpense = async (scope, id, payload) => {
  return await http.post(baseFor(scope, id), payload);
};

export const updateScopedExpense = async (scope, id, expenseId, payload) => {
  return await http.put(`${baseFor(scope, id)}/${expenseId}`, payload);
};

export const deleteScopedExpense = async (scope, id, expenseId) => {
  return await http.delete(`${baseFor(scope, id)}/${expenseId}`);
};
