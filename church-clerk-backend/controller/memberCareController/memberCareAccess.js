import CareCase from "../../models/memberCareModel/careCaseModel.js";

// Confidential care cases and private prayer requests are restricted to
// the church administrator — superadmins keep their usual bypass.
export const canSeeConfidential = (req) =>
  Boolean(req.permissions?.super) ||
  ["churchadmin", "superadmin"].includes(String(req.user?.role || "").trim().toLowerCase());

// Ids of confidential cases in this church — used to strip related
// records (visits) from list results for non-privileged users.
export const confidentialCaseIds = async (churchId) =>
  CareCase.distinct("_id", { church: churchId, confidential: true });
