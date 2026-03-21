export const ACTIONS = ["read", "create", "update", "delete"];

const CRUD_VIEW = ["read", "view", "create", "update", "delete"];
const READ_VIEW = ["read", "view"];

export const MODULES = {
  dashboard: ["read"],
  branches: CRUD_VIEW,
  members: [...CRUD_VIEW, "import"],
  ministry: CRUD_VIEW,
  events: CRUD_VIEW,
  visitors: [...CRUD_VIEW, "convert"],
  attendance: CRUD_VIEW,
  announcements: CRUD_VIEW,
  tithe: CRUD_VIEW,
  churchProjects: CRUD_VIEW,
  specialFunds: CRUD_VIEW,
  offerings: CRUD_VIEW,
  welfare: CRUD_VIEW,
  pledges: CRUD_VIEW,
  businessVentures: CRUD_VIEW,
  expenses: CRUD_VIEW,
  financialStatement: ["read", "export"],
  reportsAnalytics: ["read", "generate", "export"],
  billing: CRUD_VIEW,
  referrals: READ_VIEW,

  settingsMyProfile: ["read", "update"],
  settingsChurchProfile: ["read", "update"],
  settingsUsersRoles: ["read", "view", "create", "deactivate"],
  settingsAuditLog: ["read", "view"],

  settings: ACTIONS,
  support: READ_VIEW
};
