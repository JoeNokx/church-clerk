import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";


const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const GROUP_ICONS = {
  "People & Ministries": <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Finance": <><path d="M12 1v22M17 5.5c0-1.9-1.8-3.5-5-3.5S7 3.6 7 5.5 8.8 9 12 9s5 1.6 5 3.5S15.2 16 12 16s-5-1.6-5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  "Administration": <><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
  "Communication": <><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 0zM3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
};

const CHECK = <path d="M6 12.5l3.2 3.2L18 7.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;

function CheckItem({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">{CHECK}</svg>
      </span>
      <span className="text-sm leading-relaxed text-slate-600">{children}</span>
    </li>
  );
}

/* ── Page data ────────────────────────────────────────────────────────── */

const GROUPS = [
  {
    id: "people-ministries",
    name: "People & Ministries",
    intro: "Everything about the people in your church — who they are, where they serve, and how they grow.",
    tint: { wash: "bg-blue-100/80", gradient: "from-blue-200 to-blue-100", gradientAlt: "from-indigo-200 to-indigo-100" },
    modules: [
      {
        name: "Members",
        accent: "Every person, one complete record.",
        desc: "Stop keeping member information in notebooks and phone contacts. ChurchClerk gives each person a full profile — searchable, organized, and always up to date.",
        bullets: ["Contact details, family links, and ministry roles", "Membership status and history", "Branch and department assignment"],
      },
      {
        name: "Attendance",
        accent: "See who was there — and who wasn't.",
        desc: "Record attendance for every service in seconds, or share a check-in link so members register themselves. Trends appear automatically.",
        bullets: ["Manual recording or self check-in links", "Per-service and per-member history", "Trends across weeks and branches"],
      },
      {
        name: "Programs",
        accent: "Plan it. Track it. Remember it.",
        desc: "Conferences, crusades, and regular services all live in one place — with their own attendance and engagement records.",
        bullets: ["Schedule services and special programs", "Track attendance per program", "Review engagement across events"],
      },
      {
        name: "Organisations",
        accent: "Every group has its own space.",
        desc: "Choir, ushering, protocol, fellowships — create ministries and organisations per branch, assign members, and keep rosters current automatically.",
        bullets: ["Ministries and departments per branch", "Member and leader assignment", "Rosters that update as members change"],
      },
      {
        name: "Outreach & Follow-up",
        accent: "No visitor slips through the cracks.",
        desc: "Record visitors, first-timers, and outreach contacts — then assign follow-ups and watch people move from first visit to full membership.",
        bullets: ["Visitor and contact records", "Assigned follow-ups with status", "Convert prospects into members"],
      },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    intro: "Every cedi accounted for — contributions, spending, budgets, and statements in one auditable system.",
    tint: { wash: "bg-white", gradient: "from-emerald-200 to-emerald-100", gradientAlt: "from-teal-200 to-teal-100" },
    modules: [
      {
        name: "Tithe",
        accent: "Faithful records of faithful giving.",
        desc: "Record tithes per member with dates and branches. Each entry feeds member statements and church-wide summaries automatically.",
        bullets: ["Member-linked tithe records", "Per-branch and per-member totals", "Feeds into the financial overview"],
      },
      {
        name: "Offering & Funds",
        accent: "Every offering and special fund, counted.",
        desc: "Log offerings per service or special event — and keep earmarked funds like building or harvest separate with their own audit trail.",
        bullets: ["Per-service and per-event recording", "Special funds kept separate and auditable", "Reconciles into the finance overview"],
      },
      {
        name: "Welfare",
        accent: "Care for members, transparently.",
        desc: "Track welfare contributions and disbursements so support reaches the right people — with records leadership can review anytime.",
        bullets: ["Welfare contributions per member", "Disbursement records with reasons", "Transparent history for review"],
      },
      {
        name: "Fundraising",
        accent: "Big plans, tracked to fulfillment.",
        desc: "Church projects and member pledges live here — record commitments toward a building project or program and follow fulfillment over time.",
        bullets: ["Church projects with their own budgets", "Member pledges tracked per project", "Progress visible until completion"],
      },
      {
        name: "Budgeting",
        accent: "Plan the spending before it happens.",
        desc: "Set budgets per category or period, then compare against actual spending as it comes in — overspending surfaces early.",
        bullets: ["Budgets per category and period", "Budget vs actual comparisons", "Early warning on overspending"],
      },
      {
        name: "General Expenses",
        accent: "Every cost on record.",
        desc: "Rent, utilities, equipment, transport — church expenses are recorded with categories and history, feeding straight into the overview.",
        bullets: ["Categorized expense records", "Searchable spending history", "Included in financial overview"],
      },
      {
        name: "Business Ventures",
        accent: "Church income beyond the offering bowl.",
        desc: "Bookshops, rental halls, farms — income from church ventures is tracked alongside giving but kept clearly separate.",
        bullets: ["Venture income tracked separately", "Visible in consolidated reports", "Distinct from tithes and offerings"],
      },
      {
        name: "Financial Overview",
        accent: "The full picture, ready for review.",
        desc: "Income, expenses, and balances consolidated into a clean overview — ready for leadership review or external audit.",
        bullets: ["Consolidated income & expense view", "Branch-level breakdowns", "Exportable for audits and meetings"],
      },
    ],
  },
  {
    id: "administration",
    name: "Administration",
    intro: "The controls that keep a growing church organized — branches, people, permissions, and reports.",
    tint: { wash: "bg-blue-100/80", gradient: "from-blue-200 to-blue-100", gradientAlt: "from-indigo-200 to-indigo-100" },
    modules: [
      {
        name: "HQ & Branches",
        accent: "One headquarters. Every branch in view.",
        desc: "Register your headquarters and link every branch to it. Each location manages its own records while HQ sees the whole picture.",
        bullets: ["Branch records managed locally", "Consolidated view at headquarters", "Branch-level access control"],
      },
      {
        name: "Reports",
        accent: "Reports leadership can actually use.",
        desc: "Giving summaries, attendance trends, and growth reports generated from the data your team already records — no separate spreadsheets.",
        bullets: ["Attendance, finance, and growth reports", "Filter by branch and period", "Export to PDF, CSV, or print"],
      },
      {
        name: "Billing",
        accent: "Your plan, under your control.",
        desc: "See your current plan, renewal date, and SMS credit balance in one place — and upgrade whenever your church is ready.",
        bullets: ["Current plan and renewal date", "SMS credit balance at a glance", "Upgrade or change plans anytime"],
      },
      {
        name: "Referrals",
        accent: "Share what works.",
        desc: "Invite other churches to ChurchClerk and track the status of every referral — rewards apply automatically when they join.",
        bullets: ["Invite churches with your link", "Track referral status", "Rewards on successful referrals"],
      },
      {
        name: "Settings",
        accent: "The right access for the right people.",
        desc: "Roles decide exactly what each admin can view or change — scoped to a branch where needed — with every action logged.",
        bullets: ["Role-based permissions per admin", "Branch-scoped access", "Complete audit log of changes"],
      },
      {
        name: "Support & Help",
        accent: "Real help when you need it.",
        desc: "In-app guidance, help resources, and a direct line to the support team — because church administration doesn't wait.",
        bullets: ["Built-in help resources", "Direct access to the support team", "Guidance for every module"],
      },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    intro: "Reach your members from the same system that holds their records — no exported lists, no separate tools.",
    tint: { wash: "bg-white", gradient: "from-emerald-200 to-emerald-100", gradientAlt: "from-teal-200 to-teal-100" },
    modules: [
      {
        name: "Announcements",
        accent: "One announcement, every member.",
        desc: "Send announcements to the whole church, a single branch, or a specific ministry — scheduled ahead when you need it.",
        bullets: ["Church-wide or targeted announcements", "Schedule messages ahead of time", "Templates for recurring notices"],
      },
      {
        name: "SMS Messaging",
        accent: "Straight to their phones.",
        desc: "Text members directly from the platform — paid plans include monthly SMS credits, and you can top up whenever needed.",
        bullets: ["SMS sent from member records", "Monthly credits on paid plans", "Top up when you need more"],
      },
      {
        name: "Message Targeting",
        accent: "The right message to the right group.",
        desc: "Filter recipients by branch, ministry, department, or custom groups — the same member data powers every send.",
        bullets: ["Target by branch or ministry", "Custom recipient groups", "No exported lists needed"],
      },
      {
        name: "Delivery Tracking",
        accent: "Know it actually arrived.",
        desc: "Every message shows sent and delivered status, so failures surface immediately instead of being discovered on Sunday.",
        bullets: ["Per-message delivery status", "Sent vs delivered counts", "Failures flagged for retry"],
      },
    ],
  },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

function FeaturesPage() {
  const groupRefs = useRef({});
  const scrollTo = (id) => {
    groupRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-20 md:px-6 lg:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">ChurchClerk Features</span>
                <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
                  One system for the work behind the ministry.
                </h1>
                <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-500 md:text-lg">
                  Members, attendance, finance, communication, and administration — organized in a single platform built for how churches actually operate.
                </p>
                <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
                  Get Started
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
                <div className="relative overflow-hidden rounded-3xl">
                  <img src="/church login.jpg" alt="A church congregation gathered in worship" className="h-[300px] w-full object-cover md:h-[380px]" />
                </div>
                <div className="absolute -left-4 top-8 hidden rounded-xl bg-white p-3 shadow-lg md:block">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">{CHECK}</svg>
                    </span>
                    <div>
                      <div className="text-[10px] font-bold text-slate-800">Check-in recorded</div>
                      <div className="text-[9px] text-slate-400">Sunday service</div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 hidden rounded-xl bg-white p-3 shadow-lg md:block">
                  <div className="text-[10px] font-bold text-slate-800">Report ready</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-10 rounded-full bg-blue-200" />
                    <span className="text-[9px] text-slate-400">PDF · CSV</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-slate-50/60 py-20">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Features</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
                One platform for the whole life of your church.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
                Jump to the part of the system that matters most to you — every module works together on the same member record.
              </p>
            </div>

            {/* Group buttons → scroll to groups */}
            <div className="mx-auto mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => scrollTo(g.id)}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">{GROUP_ICONS[g.name]}</svg>
                  </span>
                  {g.name}
                </button>
              ))}
            </div>

            {/* Groups */}
            <div className="mt-16 space-y-0">
              {GROUPS.map((g) => (
                <div key={g.id} ref={(el) => { groupRefs.current[g.id] = el; }} className={`scroll-mt-28 ${g.tint.wash} py-8 md:py-12`} style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}>
                  <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
                  {/* Group header — text only */}
                  <div className="max-w-2xl">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{g.name}</span>
                    <p className="mt-3 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{g.intro}</p>
                  </div>

                  {/* Module rows */}
                  <div className="mt-8 space-y-5">
                    {g.modules.map((m, i) => (
                      <motion.div
                        key={m.name}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.5 }}
                        className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-6px_rgba(15,23,42,0.08)]"
                      >
                        <div className="grid items-stretch lg:grid-cols-2">
                          <div className={`flex items-center justify-center bg-gradient-to-br ${i % 2 === 1 ? g.tint.gradientAlt : g.tint.gradient} px-6 py-8 md:px-10 ${i % 2 === 0 ? "lg:order-2" : ""}`}>
                            <img
                              src="/hero image (3).png"
                              alt={`${m.name} module in ChurchClerk`}
                              className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className={`border-t border-slate-100 p-6 md:p-10 lg:border-t-0 ${i % 2 === 0 ? "lg:order-1 lg:border-r" : "lg:border-l"}`}>
                            <h3 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                              {m.name}: <span className="text-slate-700">{m.accent}</span>
                            </h3>
                            <p className="mt-4 text-sm leading-relaxed text-slate-500 md:text-base">{m.desc}</p>
                            <ul className="mt-6 space-y-3">
                              {m.bullets.map((b) => <CheckItem key={b}>{b}</CheckItem>)}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-950 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Start using these features today.</h2>
            <p className="mt-4 text-slate-400">Create your free account and get full access to every feature.</p>
            <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
              Get Started Free
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

export default FeaturesPage;
