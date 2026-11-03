import http from "../../../shared/services/http.js";

export const getAnnualFinancialStatement = async (params) => {
  return await http.get("/financial-statement/financial-statements/annual", { params });
};

export const getMonthlyFinancialStatement = async (params) => {
  return await http.get("/financial-statement/financial-statements/monthly", { params });
};

export const getQuarterlyFinancialStatement = async (params) => {
  return await http.get("/financial-statement/financial-statements/quarterly", { params });
};

export const exportFinancialStatement = async (params) => {
  return await http.get("/financial-statement/financial-statements/export", {
    params,
    responseType: "blob"
  });
};

export const getStatementBreakdownDetails = async (params) => {
  return await http.get("/financial-statement/financial-statements/details", { params });
};

export const getOpeningBalances = async (config = {}) => {
  return await http.get("/financial-statement/opening-balance", config);
};

export const createOpeningBalance = async (payload, config = {}) => {
  return await http.post("/financial-statement/opening-balance", payload, config);
};

export const updateOpeningBalance = async (id, payload, config = {}) => {
  return await http.put(`/financial-statement/opening-balance/${id}`, payload, config);
};
