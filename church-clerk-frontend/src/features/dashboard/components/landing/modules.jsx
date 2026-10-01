import React from "react";

export const MODULE_ICONS = {
  "Members": <><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Attendance": <><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 3v4M16 3v4M9 14l2.5 2.5L16 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
  "Programs": <><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Organisations": <><circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="5" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="19" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.5v4m0 0-5.5 4m5.5-4 5.5 4" stroke="currentColor" strokeWidth="1.7"/></>,
  "Outreach & Follow-up": <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
  "Tithe": <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2-3-2s-3 .6-3 2 1.3 1.8 3 2.2 3 .8 3 2.3-1.3 2-3 2-3-.6-3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  "Offering & Funds": <><rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M12 8v13M12 8s-1.5-5-4-5-2.5 5 0 5h4Zm0 0s1.5-5 4-5 2.5 5 0 5h-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
  "Welfare": <><path d="M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
  "Fundraising": <><path d="M3 21h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M6 21V9l6-4 6 4v12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></>,
  "Budgeting": <><path d="M12 3a9 9 0 019 9H12V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 3a9 9 0 100 18 9 9 0 000-18Zm9 9h-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "General Expenses": <><path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-3V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  "Business Ventures": <><rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Financial Overview": <><path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 3v6h6M9 17v-3m3.5 3v-6m3.5 6v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "HQ & Branches": <><path d="M4 10l8-6 8 6M6 10v10h12V10M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
  "Reports": <><path d="M4 19V5M8 19v-9m4 9V7m4 12v-6m4 6V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Billing": <><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Referrals": <><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="17" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="17" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="m8.3 10.8 6.4-3.3m-6.4 5.7 6.4 3.3" stroke="currentColor" strokeWidth="1.7"/></>,
  "Settings": <><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="15" r="1.6" stroke="currentColor" strokeWidth="1.5"/></>,
  "Support & Help": <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 9.3a2.5 2.5 0 015 .2c0 1.7-2.5 2.2-2.5 3.5M12 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Announcements": <><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
  "SMS Messaging": <><path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  "Message Targeting": <><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Delivery Tracking": <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M8.5 12.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>,
};

export const MODULES = [
  { name: "Members", desc: "Full profiles with family links, ministry roles, and status history." },
  { name: "Attendance", desc: "Record services manually or through shareable check-in links." },
  { name: "Programs", desc: "Plan services and special programs, with attendance per event." },
  { name: "Organisations", desc: "Ministries and departments with their own members and leaders." },
  { name: "Outreach & Follow-up", desc: "Track visitors and follow-ups so no one is forgotten." },
  { name: "Tithe", desc: "Member tithe records tied to dates, branches, and statements." },
  { name: "Offering & Funds", desc: "Offerings and special funds recorded and reconciled together." },
  { name: "Welfare", desc: "Welfare contributions and disbursements with transparency." },
  { name: "Fundraising", desc: "Church projects and pledges, tracked to fulfillment." },
  { name: "Budgeting", desc: "Set budgets and compare them against actual spending." },
  { name: "General Expenses", desc: "Church expenses recorded with categories and history." },
  { name: "Business Ventures", desc: "Income from church ventures tracked alongside giving." },
  { name: "Financial Overview", desc: "Consolidated statements ready for leadership review." },
  { name: "HQ & Branches", desc: "One headquarters overseeing every branch's records." },
  { name: "Reports", desc: "Attendance, finance, and growth reports, exportable." },
  { name: "Billing", desc: "Your church's plan, payments, and SMS credit balance." },
  { name: "Referrals", desc: "Invite other churches and track referral rewards." },
  { name: "Settings", desc: "Roles and access controls for every admin account." },
  { name: "Support & Help", desc: "Built-in help and direct access to the support team." },
  { name: "Announcements", desc: "Church-wide or branch-specific announcements in seconds." },
  { name: "SMS Messaging", desc: "Text members directly with credits on paid plans." },
  { name: "Message Targeting", desc: "Send to a branch, ministry, or a chosen group." },
  { name: "Delivery Tracking", desc: "See which messages were sent and delivered." },
];

export function ModuleTile({ name, desc }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3.5 transition-colors hover:border-blue-200 hover:shadow-sm">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">{MODULE_ICONS[name]}</svg>
      </span>
      <div>
        <div className="text-xs font-bold text-slate-800">{name}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{desc}</div>
      </div>
    </div>
  );
}

export function ModuleGrid({ names, title = "Modules" }) {
  const items = names
    .map((n) => MODULES.find((m) => m.name === n))
    .filter(Boolean);
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <ModuleTile key={m.name} name={m.name} desc={m.desc} />
        ))}
      </div>
    </div>
  );
}
