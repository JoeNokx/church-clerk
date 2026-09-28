import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import PriceCard from "../../../shared/components/PriceCard/index.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import { convertGhsToCurrency } from "../../../shared/utils/fx.js";
import { resolveCurrencyFromCountryCode } from "../../../shared/utils/geoCurrency.js";
import { getPlanDescriptionFeatures } from "../../../shared/utils/planDescription.js";

function Reveal({ children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: reduce ? 0 : 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, dark = false }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${dark ? "text-blue-300" : "text-blue-700"}`}>
      {children}
    </p>
  );
}

const PROBLEMS = [
  {
    title: "Member information lives everywhere",
    desc: "Contact details, family relationships, and membership status end up split across notebooks, spreadsheets, and individual phones."
  },
  {
    title: "Branch updates travel by phone call",
    desc: "Headquarters learns what happened at each branch days later — through calls and chat threads instead of a shared record."
  },
  {
    title: "Attendance is counted on paper",
    desc: "Service attendance is recorded by hand and rarely revisited, so trends and absent members go unnoticed."
  },
  {
    title: "Giving is hard to reconcile",
    desc: "Tithes, offerings, and special funds sit in separate ledgers, making financial reporting slow and error-prone."
  },
  {
    title: "Reports are assembled by hand",
    desc: "Before every leadership meeting, someone gathers figures from multiple places and hopes they agree."
  }
];

const TRUST_ITEMS = [
  {
    title: "Role-based permissions",
    desc: "Decide exactly what each pastor, clerk, or finance officer can view and edit."
  },
  {
    title: "Branch-level access",
    desc: "Branch teams work with their own records while headquarters sees the whole network."
  },
  {
    title: "Activity logging",
    desc: "Sensitive actions are recorded so leadership can see who changed what, and when."
  },
  {
    title: "Secure accounts",
    desc: "Email-verified accounts and authenticated access keep church data protected."
  }
];

const MESSAGES = [
  { type: "Announcement", title: "Easter convention schedule", meta: "Sent to all members" },
  { type: "SMS", title: "Sunday service reminder", meta: "Delivered" },
  { type: "Birthday", title: "Member birthday message", meta: "Scheduled · Automatic" },
  { type: "SMS", title: "Midweek service update", meta: "Sent to branch members" }
];

const GIVING_ROWS = [
  { date: "Sun 21 Sep", member: "K. Mensah", type: "Tithe", amount: "450.00" },
  { date: "Sun 21 Sep", member: "A. Boateng", type: "Offering", amount: "120.00" },
  { date: "Sun 21 Sep", member: "E. Owusu", type: "Welfare fund", amount: "75.00" },
  { date: "Wed 17 Sep", member: "R. Addai", type: "Special fund", amount: "300.00" }
];

const REPORTS = [
  { name: "Monthly giving summary", format: "PDF" },
  { name: "Branch attendance report", format: "CSV" },
  { name: "Member directory", format: "Print" },
  { name: "Financial statement", format: "PDF" }
];

function ComingSoonPage() {
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [visitorCurrency, setVisitorCurrency] = useState("GHS");
  const [ghsToVisitorRate, setGhsToVisitorRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);

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
    return () => { cancelled = true; };
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
    return () => { cancelled = true; };
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
    return () => { cancelled = true; };
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

  const displayCurrency = String(visitorCurrency || "GHS").trim().toUpperCase() || "GHS";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />

      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-white">
          {/* Pale blue backdrop — covers text and top two-thirds of the screenshot */}
          <div
            className="absolute inset-x-0 top-0 bottom-[100px] sm:bottom-[127px] lg:bottom-[180px]"
            style={{ backgroundColor: "#e8f1fb" }}
          />

          <div className="relative mx-auto w-full max-w-7xl px-4 pt-14 md:px-6 md:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-white">
                      <path d="M12 3L4 8v12a1 1 0 001 1h14a1 1 0 001-1V8L12 3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                    </svg>
                  </span>
                  Church Management, Simplified
                </span>
                <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 md:text-[3.5rem] lg:text-[4rem]">
                  Everything your church needs to stay organized.
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 md:text-lg">
                  Manage members, branches, communication, attendance, giving, and reports from one place — built for the people who keep a church running.
                </p>
                <div className="mt-8 flex items-center justify-center">
                  <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
                    Get Started
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Product screenshot — clean browser frame, floating module icons */}
          <div className="relative mx-auto w-full max-w-5xl px-4 pt-10 md:px-6 md:pt-14">
            {/* Floating module icons — desktop only */}
            <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="absolute -left-6 top-6 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, duration: 0.4 }} className="absolute -left-14 top-[42%] flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 10l8-6 8 6M6 10v10h12V10M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, duration: 0.4 }} className="absolute -left-8 bottom-10 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 1v22M17 5.5c0-1.9-1.8-3.5-5-3.5S7 3.6 7 5.5 8.8 9 12 9s5 1.6 5 3.5S15.2 16 12 16s-5-1.6-5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.4 }} className="absolute -right-6 top-10 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.4 }} className="absolute -right-14 top-[48%] flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.7"/><path d="M8 13l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, duration: 0.4 }} className="absolute -right-8 bottom-14 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
              </motion.div>
            </div>

            <Reveal delay={0.15}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {/* Browser bar */}
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  </div>
                  <div className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-md bg-slate-100 px-3 py-1">
                    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-slate-400">
                      <path d="M8 1a4 4 0 00-4 4v1H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm0 1.5A2.5 2.5 0 0110.5 5v1h-5V5A2.5 2.5 0 018 2.5z" fill="currentColor" />
                    </svg>
                    <span className="truncate font-mono text-xs text-slate-500">app.churchclerkapp.com</span>
                  </div>
                  <div className="w-12" />
                </div>
                <img
                  src="/hero image (3).png"
                  alt="The ChurchClerk dashboard showing member, attendance, and finance overview"
                  className="block h-[300px] w-full object-cover object-top sm:h-[380px] lg:h-[540px]"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-5">
              <Eyebrow>The Reality</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Church administration shouldn't feel scattered.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                The work already gets done — it's just spread across too many places. That fragmentation costs time, hides problems, and makes accountability harder than it needs to be.
              </p>
            </Reveal>
            <div className="md:col-span-7">
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {PROBLEMS.map((p, i) => (
                  <Reveal key={p.title} delay={i * 0.05}>
                    <li className="grid grid-cols-1 gap-1 py-5 sm:grid-cols-[2rem_1fr] sm:gap-4">
                      <span className="text-sm font-semibold text-blue-700">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── PRODUCT INTRO ── */}
        <section id="product" className="border-y border-slate-200 bg-slate-50 py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-7 md:order-1 order-2">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img
                  src="/hero image (3).png"
                  alt="ChurchClerk interface showing organized church records"
                  className="block max-h-[440px] w-full object-cover object-bottom"
                />
              </div>
            </Reveal>
            <Reveal className="md:col-span-5 md:order-2 order-1">
              <Eyebrow>The Platform</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                One place for the work behind the ministry.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                ChurchClerk brings your member records, branches, attendance, communication, giving, and reports into a single system — so the same information serves everyone who needs it.
              </p>
              <div className="mt-7">
                <Link to="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors">
                  Explore the features
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE STORY: MEMBERS ── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-5">
              <Eyebrow>Members</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Know the people in your congregation.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Every member gets a complete profile — contact details, family links, departments, and membership status — searchable and always up to date.
              </p>
            </Reveal>
            <Reveal className="md:col-span-7" delay={0.08}>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Member profile</p>
                    <p className="text-xs text-slate-500">Adenta Branch</p>
                  </div>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                </div>
                <dl className="divide-y divide-slate-100">
                  {[
                    ["Full name", "Yaw Oppong"],
                    ["Phone", "+233 24 000 0000"],
                    ["Department", "Ushering"],
                    ["Ministry", "Men's Fellowship"],
                    ["Member since", "March 2019"]
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-sm font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE STORY: BRANCHES / MULTI-BRANCH ── */}
        <section className="border-y border-slate-200 bg-slate-50 py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-7 md:order-1 order-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mx-auto max-w-xs rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Headquarters</p>
                  <p className="mt-1 text-sm font-semibold text-white">Consolidated view of every branch</p>
                </div>
                <div className="mx-auto h-8 w-px bg-slate-300" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {["Adenta Branch", "Kumasi Branch", "Tema Branch"].map((name) => (
                    <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Own records · own team</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-center text-xs leading-relaxed text-slate-500">
                    Members · Attendance · Giving · Reports — each branch manages its own records while the headquarters sees consolidated reports across the network.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal className="md:col-span-5 md:order-2 order-1">
              <Eyebrow>Branches</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                One headquarters. Every branch in view.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Register a headquarters and link your branches to it. Each branch manages its own members, attendance, and giving — while leadership sees consolidated reports across the entire network.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE STORY: COMMUNICATION ── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-5">
              <Eyebrow>Communication</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Reach your members without chasing them.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Send announcements and SMS to the whole church, a branch, or a department. Schedule messages ahead of time and let birthday messages go out automatically.
              </p>
            </Reveal>
            <Reveal className="md:col-span-7" delay={0.08}>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Recent messages</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {MESSAGES.map((m) => (
                    <li key={m.title} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="w-24 shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[11px] font-semibold text-slate-600">
                        {m.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{m.title}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">{m.meta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE STORY: ATTENDANCE ── */}
        <section className="border-y border-slate-200 bg-slate-50 py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-7 md:order-1 order-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Service attendance</p>
                  <span className="text-xs text-slate-500">Last 8 weeks</span>
                </div>
                <div className="mt-6 flex h-36 items-end gap-2">
                  {[46, 62, 55, 74, 68, 82, 78, 90].map((h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t-md bg-blue-600/85" style={{ height: `${h}%` }} />
                      <span className="text-[10px] font-medium text-slate-400">W{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <span>Compare branches side by side</span>
                  <span>Spot trends over time</span>
                </div>
              </div>
            </Reveal>
            <Reveal className="md:col-span-5 md:order-2 order-1">
              <Eyebrow>Attendance</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                See who was there — and who wasn't.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Record attendance for every service, or share a check-in link members can use themselves. Trends and branch comparisons make pastoral follow-up easier.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE STORY: GIVING (full-width ledger) ── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="max-w-2xl">
              <Eyebrow>Giving & Finance</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Every contribution accounted for.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Record tithes, offerings, welfare, and special funds — each entry linked to a member and a date. Financial records stay clear, auditable, and ready for reporting.
              </p>
            </Reveal>
            <Reveal className="mt-10" delay={0.08}>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Member</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 text-right font-semibold">Amount (GHS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {GIVING_ROWS.map((r, i) => (
                      <tr key={i}>
                        <td className="px-5 py-3.5 text-slate-500">{r.date}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{r.member}</td>
                        <td className="px-5 py-3.5 text-slate-600">{r.type}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{r.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE STORY: REPORTS ── */}
        <section className="border-y border-slate-200 bg-slate-50 py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-5">
              <Eyebrow>Reports</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Reports leadership can actually use.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Generate giving summaries, attendance trends, and branch comparisons from the same data your team already records. Export to PDF or CSV, share securely, or print.
              </p>
            </Reveal>
            <Reveal className="md:col-span-7" delay={0.08}>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Generated reports</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {REPORTS.map((r) => (
                    <li key={r.name} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{r.name}</p>
                      <span className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{r.format}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── TRUST / SECURITY ── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 md:grid-cols-12 md:gap-14 md:px-6">
            <Reveal className="md:col-span-4">
              <Eyebrow>Trust & Control</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Built for real accountability.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Church data is sensitive. ChurchClerk gives leadership clear control over who sees what — and a record of what happened.
              </p>
            </Reveal>
            <div className="md:col-span-8">
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
                {TRUST_ITEMS.map((t, i) => (
                  <Reveal key={t.title} delay={i * 0.05} className="bg-white">
                    <div className="h-full p-6">
                      <h3 className="text-base font-semibold text-slate-900">{t.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="border-t border-slate-200 bg-slate-50 py-20 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Plans that grow with your church.
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Start free. Upgrade when you're ready. No hidden fees, no complicated contracts.
              </p>
            </Reveal>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {[{ key: "monthly", label: "Monthly" }, { key: "halfYear", label: "6 Months" }, { key: "yearly", label: "Yearly" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setBillingInterval(key)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${billingInterval === key ? "bg-blue-700 text-white" : "text-slate-600 hover:text-slate-900"}`}
                  >{label}</button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Prices shown in <span className="font-semibold text-slate-600">{displayCurrency}</span>
                {fxLoading && <span className="ml-1">(updating…)</span>}
              </p>
            </div>

            <div className="mt-10">
              {loadingPlans && <div className="py-16 flex items-center justify-center"><Spinner className="text-slate-400" /></div>}
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
                      <Reveal key={id} delay={idx * 0.04}>
                        <PriceCard id={id} name={name} price={displayPrice} currency={displayCurrency} per={per} isMostPopular={isMostPopular} memberLimit={memberLimit} features={highlights} actionLabel="Get started" actionHref="/register" variant="landing" />
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-10 text-center">
              <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors">
                See full pricing details
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="bg-slate-950 py-20 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-3xl text-center">
              <Eyebrow dark>Get Started</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                Your church deserves better tools for the work behind the scenes.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-400">
                Start using ChurchClerk to keep your members, branches, giving, and reports in one organized system.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                  Get Started
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                  Already have an account? Sign in
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default ComingSoonPage;
