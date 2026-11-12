export const ACTIONS = ["read", "create", "update", "delete"];

const CRUD_VIEW = ["read", "create", "update", "delete"];
const READ_VIEW = ["read"];

export const MODULES = {
  dashboard: ["read"],
  branches: CRUD_VIEW,
  members: [...CRUD_VIEW, "import"],
  organisation: CRUD_VIEW,
  programs: CRUD_VIEW,
  visitors: [...CRUD_VIEW, "convert"],
  attendance: CRUD_VIEW,
  announcements: CRUD_VIEW,
  outreach: CRUD_VIEW,
  memberCare: CRUD_VIEW,
  tithe: CRUD_VIEW,
  budgeting: CRUD_VIEW,
  churchProjects: CRUD_VIEW,
  specialFunds: CRUD_VIEW,
  offerings: CRUD_VIEW,
  welfare: CRUD_VIEW,
  pledges: CRUD_VIEW,
  businessVentures: CRUD_VIEW,
  expenses: CRUD_VIEW,
  financialStatement: ["read", "create", "update", "delete", "export"],
  // Financial governance controls: who sees the approval queue, who can
  // approve/reject, and who is exempt from the backdating/immutability rules.
  financeGovernance: ["read", "approve", "backdate", "override", "update"],
  reportsAnalytics: ["read", "generate", "export"],
  billing: CRUD_VIEW,
  referrals: READ_VIEW,

  settingsMyProfile: ["read", "update"],
  settingsChurchProfile: ["read", "update", "delete"],
  settingsUsersRoles: ["read", "create", "update", "deactivate"],
  settingsAuditLog: ["read"],

  settings: ACTIONS,
  support: [...READ_VIEW, "update"],

  // System-scope modules — power the admin portal's routes. They appear in
  // the role matrix for system-scope roles only (see SYSTEM_MODULES) and
  // are hidden from church role editors.
  systemChurches: ["read", "update", "delete"],
  systemUsers: ["read", "create", "update", "delete"],
  systemRoles: ["read", "create", "update", "delete"],
  systemBilling: ["read", "create", "update", "delete", "runCycle"],
  systemSupport: ["read", "update"]
};

// Modules that only apply to system-scope roles — used to filter them out
// of church-side role editors.
export const SYSTEM_MODULES = [
  "systemChurches",
  "systemUsers",
  "systemRoles",
  "systemBilling",
  "systemSupport"
];
