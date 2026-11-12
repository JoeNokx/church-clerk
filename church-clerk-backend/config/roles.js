// Only the super admin is a built-in system role. Every other system role
// (e.g. a support admin) is a DB-backed role the super admin creates —
// exactly like any other system user.
export const SYSTEM_ROLES = ["superadmin"];
export const CHURCH_ROLES = ["churchclerkadmin"];

export const ROLE_DISPLAY_NAMES = {
  superadmin: "Super Admin",
  churchclerkadmin: "ChurchClerk Admin"
};

// Role keys that existed before the rename / before defaults were trimmed —
// used by the role seeder to migrate existing databases (role docs and
// user.role strings).
export const LEGACY_ROLE_KEY_MAP = {
  churchadmin: "churchclerkadmin",
  admin: "churchclerkadmin",
  headpastor: "churchclerkadmin",
  financialofficer: "churchclerkadmin",
  treasurer: "churchclerkadmin",
  leader: "churchclerkadmin",
  ministryleader: "churchclerkadmin",
  associateadmin: "churchclerkadmin",
  secretary: "churchclerkadmin"
};

// Keys reserved for the system side — churches may not reuse them for
// custom roles. "supportadmin" is no longer a built-in (it lives in system
// scope as a DB-backed role), but the key stays reserved.
export const REMOVED_ROLE_KEYS = ["associateadmin", "headpastor", "treasurer", "ministryleader", "secretary", "supportadmin"];

export const ROLE_PERMISSIONS = {

  // SYSTEM ROLES
  superadmin: {
    __all__: true
  },

  // CHURCH ROLES
  churchclerkadmin: {
    dashboard: ["read", "create", "update", "delete"],
    branches: ["read", "create", "update", "delete"],
    members: ["read", "create", "update", "delete", "import"],
    attendance: ["read", "create", "update", "delete"],
    visitors: ["read", "create", "update", "delete", "convert"],
    programs: ["read", "create", "update", "delete"],
    organisation: ["read", "create", "update", "delete"],
    tithe: ["read", "create", "update", "delete"],
    budgeting: ["read", "create", "update", "delete"],
    announcements: ["read", "create", "update", "delete"],
    outreach: ["read", "create", "update", "delete"],
    memberCare: ["read", "create", "update", "delete"],
    finance: ["read"],
    billing: ["read", "create", "update", "delete"],
    referrals: ["read"],
    settings: ["read", "create", "update", "delete"],
    settingsUsersRoles: ["read", "create", "update", "deactivate"],
    settingsAuditLog: ["read"],
    reportsAnalytics: ["read", "generate", "export"],
    specialFunds: ["read", "create", "update", "delete"],
    offerings: ["read", "create", "update", "delete"],
    welfare: ["read", "create", "update", "delete"],
    expenses: ["read", "create", "update", "delete"],
    pledges: ["read", "create", "update", "delete"],
    churchProjects: ["read", "create", "update", "delete"],
    businessVentures: ["read", "create", "update", "delete"],
    financialStatement: ["read", "create", "update", "delete", "export"],
    financeGovernance: ["read", "approve", "backdate", "override", "update"],
  }
};
