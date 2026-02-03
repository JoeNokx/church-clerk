import http from "../../../shared/services/http.js";

export const getWelfareKPI = async () => {
  return await http.get("/welfare/welfare/stats/kpi");
};
