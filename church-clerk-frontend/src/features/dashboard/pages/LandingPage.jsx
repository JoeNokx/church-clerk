import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import MinistryPlusCustomPlanModal from "../../../shared/components/MinistryPlusCustomPlanModal.jsx";
import PriceCard from "../../../shared/components/PriceCard/index.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { convertGhsToCurrency } from "../../../shared/utils/fx.js";
import { resolveCurrencyFromCountryCode } from "../../../shared/utils/geoCurrency.js";
import PlanComparisonTable from "../../subscription/components/PlanComparisonTable.jsx";
import { getPlanDescriptionFeatures } from "../../../shared/utils/planDescription.js";

function formatCurrency(amount, currency) {
  return formatMoney(amount, currency);
}

const FEATURES = [
  {
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    title: "Member Management",
    desc: "Complete member profiles with contact info, family links, ministry roles, and status history. Know every person in your congregation."
  },
  {
    icon: <><path d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.7"/><path d="M8 13l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
    title: "Attendance Tracking",
    desc: "Record service attendance manually or via shareable check-in links. See trends, identify consistent members, and flag those needing pastoral care."
  },
  {
    icon: <><path d="M12 1v22M17 5.5c0-1.9-1.8-3.5-5-3.5S7 3.6 7 5.5 8.8 9 12 9s5 1.6 5 3.5S15.2 16 12 16s-5-1.6-5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    title: "Giving & Finance",
    desc: "Track tithes, offerings, income, expenses, welfare, and special funds. Every contribution accounted for with clear, auditable records."
  },
  {
    icon: <><path d="M4 19V5M8 19V10M12 19V7M16 19V13M20 19V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    title: "Reports & Analytics",
    desc: "Attendance trends, financial summaries, budget vs actuals, and member growth reports—visualized clearly for leadership decisions."
  },
  {
    icon: <><path d="M4 10l8-6 8 6M6 10v10h12V10M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
    title: "HQ & Branch Management",
    desc: "One headquarters, multiple branches. Each branch manages its own records while the HQ sees consolidated reports across the network."
  },
  {
    icon: <><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
    title: "Roles & Permissions",
    desc: "Control exactly what each team member can view or edit. Full audit logs so leadership always knows who changed what and when."
  }
];

const STEPS = [
  { n: "1", title: "Create your account", desc: "Sign up in minutes. Your account is ready immediately—no waiting, no approval delays." },
  { n: "2", title: "Set up your church profile", desc: "Add your church name, logo, branches, and configure roles and permissions for your leadership team." },
  { n: "3", title: "Add your members", desc: "Import or manually enter member records with contact details, family links, and ministry involvement." },
  { n: "4", title: "Run services and record giving", desc: "Take attendance for each service. Record tithes, offerings, and expenses—all linked to the right member and date." },
  { n: "5", title: "Review insights and grow", desc: "Analyze attendance trends, financial summaries, and member growth. Make confident, data-driven decisions." }
];

const BENEFITS = [
  { title: "Cut admin time by hours each week", desc: "Automate record-keeping for members, attendance, and finance. Reduce manual data entry and spreadsheet chaos permanently." },
  { title: "Never lose a financial record again", desc: "Every contribution, expense, and transaction is tracked, categorized, and searchable—with a complete audit trail." },
  { title: "Keep your leadership accountable", desc: "Roles, permissions, and activity logs ensure everyone acts within their authority and nothing goes unnoticed or unreported." },
  { title: "Make decisions with real data", desc: "Attendance trends, giving patterns, and budget comparisons give you the insight to lead with clarity and confidence." }
];

const TESTIMONIALS = [
  {
    quote: "ChurchClerk transformed how we manage our members and finances. The branch oversight feature is exactly what we needed for our growing network.",
    name: "Pastor Emmanuel A.",
    role: "Senior Pastor",
    church: "Grace Chapel International"
  },
  {
    quote: "Before ChurchClerk, tracking attendance and giving was a nightmare. Now our admins spend a fraction of the time and the reports are always ready when we need them.",
    name: "Deaconess Martha O.",
    role: "Church Administrator",
    church: "Victory Assembly"
  },
  {
    quote: "The finance module gives our board complete confidence. We know exactly where every offering goes, and our members trust us more because of it.",
    name: "Elder Joseph K.",
    role: "Finance Director",
    church: "Lighthouse Ministries"
  }
];

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function LandingPage() {
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
  const [visitorCurrency, setVisitorCurrency] = useState("GHS");
  const [ghsToVisitorRate, setGhsToVisitorRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);
  const [faqOpen, setFaqOpen] = useState("security");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlans(true);
      try {
        const res = await http.get("/subscription/public/plans");
        if (cancelled) return;
        setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
      } catch {
        if (cancelled) return;
        setPlans([]);
      } finally {
        if (cancelled) return;
        setLoadingPlans(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFxLoading(true);
      try {
        const rate = await convertGhsToCurrency(1, visitorCurrency);
        if (cancelled) return;
        const n = Number(rate);
        setGhsToVisitorRate(Number.isFinite(n) && n > 0 ? n : 1);
      } catch {
        if (cancelled) return;
        setGhsToVisitorRate(1);
      } finally {
        if (cancelled) return;
        setFxLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitorCurrency]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
        if (!res.ok) throw new Error("geo lookup failed");
        const json = await res.json();
        if (cancelled) return;
        const code = String(json?.country_code || json?.country || "").trim().toUpperCase();
        const resolved = resolveCurrencyFromCountryCode(code);
        setVisitorCurrency(resolved?.currency || "GHS");
      } catch {
        if (cancelled) return;
        setVisitorCurrency("GHS");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const plansSorted = useMemo(() => {
    const rows = Array.isArray(plans) ? plans : [];
    const order = { "free lite": 0, basic: 1, standard: 2, premium: 3 };
    return rows.slice().sort((a, b) => {
      const aName = String(a?.name || "").toLowerCase();
      const bName = String(b?.name || "").toLowerCase();
      const aRank = Number.isFinite(order[aName]) ? order[aName] : 99;
      const bRank = Number.isFinite(order[bName]) ? order[bName] : 99;
      if (aRank !== bRank) return aRank - bRank;
      return aName.localeCompare(bName);
    });
  }, [plans]);

  const displayCurrency = String(visitorCurrency || "USD").trim().toUpperCase() || "USD";

  const plansForComparison = useMemo(() => {
    const rows = Array.isArray(plansSorted) ? plansSorted.filter((p) => p?.isActive !== false) : [];
    const byName = (name) => rows.find((p) => String(p?.name || "").trim().toLowerCase() === name) || null;

    const picked = [byName("basic"), byName("standard"), byName("premium")].filter(Boolean);
    if (picked.length > 0) return picked;

    const withoutFreeLite = rows.filter((p) => String(p?.name || "").trim().toLowerCase() !== "free lite");
    return withoutFreeLite.slice(0, 3);
  }, [plansSorted]);


  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
          {/* Background decoration */}
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-3xl pointer-events-none" />

          {/* ── Text content — centered ── */}
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-20 pb-16 text-center md:pt-28 md:pb-20 md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-xs font-semibold text-blue-300">Built for African churches, trusted worldwide</span>
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
                Run your entire church{" "}
                <span className="text-blue-400">from one platform.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
                ChurchClerk gives pastors, administrators, and finance teams a single place to manage members, attendance, giving, ministries, and branch operations—with complete accountability.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">
                  Start Free Trial
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </Link>
                <a href="#pricing" className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                  View Pricing
                </a>
              </div>
              <div className="mt-7 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-slate-400">
                {["Free to start", "No credit card required", "Setup in minutes"].map(t => (
                  <span key={t} className="flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-blue-400"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Dashboard screenshot — full-width, large ── */}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative pb-14 sm:pb-20"
            >
              {/* Glow behind the frame */}
              <div className="absolute -inset-x-4 -top-4 bottom-8 rounded-3xl bg-blue-600/15 blur-3xl" />
              <div className="absolute -bottom-2 left-16 right-16 h-32 rounded-full bg-blue-700/20 blur-2xl" />

              {/* Browser chrome frame */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_100px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/5">
                {/* Chrome titlebar */}
                <div className="flex items-center gap-3 border-b border-white/10 bg-[#1a2035] px-5 py-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex flex-1 items-center gap-2 rounded-md bg-[#232b40] px-3 py-1.5 max-w-sm mx-auto">
                    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-slate-500">
                      <path d="M8 1a4 4 0 00-4 4v1H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm0 1.5A2.5 2.5 0 0110.5 5v1h-5V5A2.5 2.5 0 018 2.5z" fill="currentColor" />
                    </svg>
                    <span className="text-xs font-mono text-slate-400 truncate">app.churchclerk.com/dashboard</span>
                  </div>
                </div>
                {/* Screenshot */}
                <img
                  src="/hero image (3).png"
                  alt="ChurchClerk Dashboard"
                  className="block w-full"
                />
              </div>

              {/* Floating card — Active Members (left) */}
              <motion.div
                initial={{ opacity: 0, x: -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5, ease: "easeOut" }}
                className="absolute left-2 top-20 hidden md:block rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-md"
              >
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Active Members</p>
                <p className="mt-1 text-2xl font-bold leading-none text-white">1,248</p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M8 2a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 018 2z" clipRule="evenodd" transform="rotate(180 8 8)" />
                  </svg>
                  +12% this month
                </p>
              </motion.div>

              {/* Floating card — Sunday Attendance (right) */}
              <motion.div
                initial={{ opacity: 0, x: 20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5, ease: "easeOut" }}
                className="absolute bottom-8 right-2 hidden md:block rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-md"
              >
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Sunday Attendance</p>
                <p className="mt-1 text-2xl font-bold leading-none text-white">94%</p>
                <div className="mt-2 flex items-end gap-0.5">
                  {[7, 9, 6, 10, 8, 10, 9].map((h, i) => (
                    <div key={i} className="w-2.5 rounded-sm bg-blue-500/70" style={{ height: `${h * 2.5}px` }} />
                  ))}
                </div>
              </motion.div>

              {/* Floating badge — live */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.4, ease: "easeOut" }}
                className="absolute right-8 top-12 hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 shadow-lg backdrop-blur-sm"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">Offering logged</span>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom fade into next section */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
        </section>

        {/* ── TRUST BAR ── */}
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6">
            <div className="flex flex-wrap items-center justify-center gap-5 md:gap-10">
              {[
                "Designed for churches of all sizes",
                "Role-based access control",
                "HQ & multi-branch oversight",
                "Full financial audit trail",
                "Transparent activity logging"
              ].map(label => (
                <div key={label} className="flex items-center gap-2 text-slate-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-blue-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  <span className="text-xs font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="bg-white py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Platform Overview</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Everything your church needs, built in.</h2>
              <p className="mt-4 text-base text-slate-500">From member registration to financial auditing—ChurchClerk covers every workflow your pastoral and admin team relies on daily.</p>
            </motion.div>
            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.06 }} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:border-blue-100 hover:shadow-md transition-all">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">{f.icon}</svg>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="bg-white py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Simple Setup</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Up and running in under an hour.</h2>
              <p className="mt-4 text-base text-slate-500">No training course needed. ChurchClerk is designed to be intuitive for administrators at any technology experience level.</p>
            </motion.div>
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <motion.div key={s.n} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.07 }} className="relative rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">{s.n}</div>
                  <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENEFITS ── */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">The outcomes your church deserves.</h2>
              <p className="mt-4 text-blue-100">ChurchClerk isn't just a database—it's a management system designed to save time, build trust, and help leadership make better decisions.</p>
            </motion.div>
            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
              {BENEFITS.map((b, i) => (
                <motion.div key={b.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.08 }} className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-white"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-blue-100">{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="bg-white py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Transparent Pricing</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Plans that grow with your church.</h2>
              <p className="mt-4 text-base text-slate-500">Start free. Upgrade when you're ready. No hidden fees, no complicated contracts.</p>
            </motion.div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[{ key: "monthly", label: "Monthly" }, { key: "halfYear", label: "6 Months" }, { key: "yearly", label: "Yearly" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setBillingInterval(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${billingInterval === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >{label}</button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Prices shown in <span className="font-semibold text-slate-600">{displayCurrency}</span>
                {fxLoading && <span className="ml-1">(updating…)</span>}
              </p>
            </div>

            <div className="mt-10">
              {loadingPlans && <div className="py-16 text-center text-sm text-slate-500">Loading plans…</div>}
              {!loadingPlans && plansSorted.length === 0 && <div className="py-16 text-center text-sm text-slate-500">No plans available right now.</div>}
              {!loadingPlans && plansSorted.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {plansSorted.map((p, idx) => {
                    const id = p?._id;
                    const name = String(p?.name || "");
                    const isMostPopular = name.toLowerCase() === "standard";
                    const ghsPrice = p?.pricing?.GHS?.[billingInterval] ?? p?.priceByCurrency?.GHS?.[billingInterval] ?? 0;
                    const displayPrice = Number(ghsPrice || 0) * Number(ghsToVisitorRate || 1);
                    const per = billingInterval === "monthly" ? "/month" : billingInterval === "halfYear" ? "/6 months" : "/year";
                    const memberLimit = p?.memberLimit;
                    const memberLine = memberLimit === null ? "Unlimited members" : `Up to ${Number(memberLimit || 0).toLocaleString()} members`;
                    const descriptionFeatures = getPlanDescriptionFeatures(p, { max: 5 });
                    const highlights = [memberLine, ...descriptionFeatures];
                    return (
                      <motion.div key={id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, delay: idx * 0.04 }}>
                        <PriceCard id={id} name={name} price={displayPrice} currency={displayCurrency} per={per} isMostPopular={isMostPopular} memberLimit={memberLimit} features={highlights} actionLabel="Get started" actionHref="/register" variant="landing" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <PlanComparisonTable plans={plansForComparison} title="Compare packages" subtitle="This table updates automatically as plans change. Tap &ldquo;See more&rdquo; to view all features." collapsible collapsedCount={7} priorityKeys={["financeModule", "budgeting", "branchesOverview", "programsEvents", "announcements", "reportsAnalytics"]} />

            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Need a fully customized solution?</h3>
                  <p className="mt-1 text-sm text-slate-500">Ministry Plus is built around your church's specific workflows, scale, and integration needs.</p>
                </div>
                <button type="button" onClick={() => setShowCustomPlanModal(true)} className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                  Contact us for Ministry Plus
                </button>
              </div>
            </div>

            <MinistryPlusCustomPlanModal open={showCustomPlanModal} onClose={() => setShowCustomPlanModal(false)} defaultEmail="" />
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Trusted by Churches</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">What church leaders are saying.</h2>
            </motion.div>
            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={t.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.08 }} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex gap-0.5 text-amber-400">
                    {[1,2,3,4,5].map(n => <svg key={n} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">"{t.quote}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{t.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role} · {t.church}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-white py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">FAQ</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Common questions, answered.</h2>
            </motion.div>
            <div id="faq" className="mx-auto mt-12 max-w-3xl space-y-2">
              {[
                { key: "security", q: "Is our church data secure?", a: "Yes. ChurchClerk uses role-based access control so each team member only accesses what they need. Every sensitive action is recorded in an audit log, giving your leadership full visibility." },
                { key: "setup", q: "How quickly can we get started?", a: "Most churches complete their initial setup—church profile, leadership roles, first members—within the same session. No complex onboarding or training required." },
                { key: "hq", q: "We have multiple branches. Does ChurchClerk handle that?", a: "Absolutely. You can register a headquarters and link multiple branches. Each branch manages its own records while the HQ sees consolidated reports across the entire network." },
                { key: "finance", q: "How does the finance tracking work?", a: "You can record tithes, multiple offering types, income, expenses, welfare contributions, and special fund disbursements. Every record is linked to a member, service, or fund—making reconciliation and reporting straightforward." },
                { key: "budgeting", q: "Can we create and monitor a church budget?", a: "Yes. Create your budget, record actual income and expenses throughout the year, and compare budget vs actuals anytime. It keeps the church financially disciplined and gives your board a clear picture." },
                { key: "pricing", q: "Can we upgrade or change our plan later?", a: "Yes. Start with the free tier to explore the platform and upgrade anytime as your church grows. There are no long-term commitments." },
                { key: "custom", q: "Do you offer a custom enterprise solution?", a: "Yes. Ministry Plus is a fully customized plan with bespoke workflows, integrations, and dedicated support—designed around your specific church needs. Contact us to discuss." }
              ].map((row) => {
                const isOpen = faqOpen === row.key;
                return (
                  <div key={row.key} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                    <button type="button" onClick={() => setFaqOpen(v => v === row.key ? "" : row.key)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left">
                      <span className="text-sm font-semibold text-slate-900">{row.q}</span>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                          <path d={isOpen ? "M6 12h12" : "M6 12h12M12 6v12"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                          <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{row.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="bg-slate-950 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                Modernize your church management today.
              </h2>
              <p className="mt-5 text-base text-slate-400">
                Join churches that have moved from spreadsheets and paper records to a clear, accountable, and organized system built for ministry.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">
                  Create your free account
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </Link>
                <Link to="/login" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                  Sign in to your account
                </Link>
              </div>
              <p className="mt-6 text-xs text-slate-600">Free to start · No credit card required · Cancel anytime</p>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;
