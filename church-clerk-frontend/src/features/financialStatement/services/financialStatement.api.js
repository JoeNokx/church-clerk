import http from "../../../shared/services/http.js";

export const getAnnualFinancialStatement = async (params) => {
  return await http.get("/financial-statement/financial-statements/annual", { params });
};

export const getMonthlyFinancialStatement = async (params) => {
  return await http.get("/financial-statement/financial-statements/monthly", { params });
};
