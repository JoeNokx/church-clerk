export const SYSTEM_ROLES = ["superadmin", "supportadmin"];
export const CHURCH_ROLES = [
  "churchadmin",
  "financialofficer",
  "secretary",
  "leader"
];

export const ROLE_PERMISSIONS = {

  // SYSTEM ROLES
  superadmin: {
    __all__: true
  },

  supportadmin: {
    dashboard: ["read", "create", "update", "delete"],
    branches: ["read", "create", "update", "delete"],
    members: ["read", "create", "update", "delete"],
    attendance: ["read", "create", "update", "delete"],
    visitors: ["read", "create", "update", "delete"],
    events: ["read", "create", "update", "delete"],
    announcements: ["read", "create", "update", "delete"],
    reportsAnalytics: ["read"],
    billing: ["read"],
    referrals: ["read"],
    settings: ["read", "create", "update", "delete"],
    support: ["read"],

    // Finance modules (view-only)
    tithe: ["read"],
    churchProjects: ["read"],
    specialFunds: ["read"],
    offerings: ["read"],
    welfare: ["read"],
    pledges: ["read"],
    businessVentures: ["read"],
    expenses: ["read"],
    financialStatement: ["read"]
  },

  // CHURCH ROLES
  churchadmin: {
    dashboard: ["read", "create", "update", "delete"],
    members: ["read", "create", "update", "delete"],
    attendance: ["read", "create", "update", "delete"],
    visitors: ["read", "create", "update", "delete"],
    events: ["read", "create", "update", "delete"],
    tithe: ["read", "create", "update", "delete"],
    announcements: ["read", "create", "update", "delete"],
    finance: ["read"],
    billing: ["read", "create", "update", "delete"],
    settings: ["read", "create", "update", "delete"],
    reportsAnalytics: ["read"],
    specialFunds: ["read"],
    offerings: ["read", "create", "update", "delete"],
    welfare: ["read", "create", "update", "delete"],
    expenses: ["read", "create", "update", "delete"],
    pledges: ["read", "create", "update", "delete"],
    financialStatement: ["read"],
  },

  financialofficer: {
    dashboard: ["read"],
    tithe: ["read", "create"],
    offerings: ["read", "create"],
    welfare: ["read"],
    expenses: ["read", "create", "update"],
    financialStatement: ["read"],
    reportsAnalytics: ["read"]
  },

  secretary: {
    dashboard: ["read"],
    members: ["read", "create", "update"],
    announcements: ["read", "create"],
    attendance: ["read", "create"]
  },

  leader: {
    dashboard: ["read"],
    members: ["read"],
    attendance: ["read"],
    reportsAnalytics: ["read"]
  }
};
