import http from "../../../shared/services/http.js";

export async function searchWelfareMembers(search) {
  return await http.get("/welfare/members/search", { params: { search } });
}
