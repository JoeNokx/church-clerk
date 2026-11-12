// Display names and helpers for the system's built-in roles. Custom
// (DB-backed) roles carry their own name — fall back to it via roleLabel.

export const ROLE_LABELS = {
  superadmin: "Super Admin",
  supportadmin: "Support Admin",
  churchclerkadmin: "ChurchClerk Admin"
};

export const normalizeRoleKey = (role) =>
  String(role || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

export const roleLabel = (role, fallbackName = "") => {
  const key = normalizeRoleKey(role);
  if (!key) return "";
  return ROLE_LABELS[key] || String(fallbackName || role || "").trim() || key;
};
