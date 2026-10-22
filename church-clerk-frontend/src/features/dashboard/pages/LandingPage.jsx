import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import PriceCard from "../../../shared/components/PriceCard/index.jsx";
import { convertGhsToCurrency } from "../../../shared/utils/fx.js";
import { resolveCurrencyFromCountryCode } from "../../../shared/utils/geoCurrency.js";
import { getPlanDescriptionFeatures } from "../../../shared/utils/planDescription.js";
import { computeSavingsPct } from "../../../shared/utils/planSavings.js";
import LandingButton from "../../../shared/components/LandingButton/index.jsx";
import FaqAccordion from "../../../shared/components/FaqAccordion/index.jsx";
import { MODULE_ICONS } from "../components/landing/modules.jsx";

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

function HeroScreenshot({ children }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tiltX = useSpring(useTransform(py, [-0.5, 0.5], [3.5, -3.5]), { stiffness: 160, damping: 22 });
  const tiltY = useSpring(useTransform(px, [-0.5, 0.5], [-4, 4]), { stiffness: 160, damping: 22 });

  const onPointerMove = (e) => {
    if (reduce || e.pointerType !== "mouse" || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => { px.set(0); py.set(0); };

  return (
    <div ref={wrapRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} style={{ perspective: 1400 }} className="relative">
      {/* Soft floor glow — sells the 3D depth */}
      <div aria-hidden="true" className="absolute inset-x-8 -bottom-6 h-16 rounded-[100%] bg-blue-900/15 blur-2xl" />
      <motion.div
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: 36, rotateX: 14 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div style={{ rotateX: reduce ? 0 : tiltX, rotateY: reduce ? 0 : tiltY, transformStyle: "preserve-3d" }}>
          {children}
        </motion.div>
      </motion.div>
    </div>
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
    title: "Member records live everywhere",
    desc: "Contact details, family links, and membership status end up split across notebooks, spreadsheets, and individual phones.",
    icon: MODULE_ICONS["Members"],
    color: "#4f39f6"
  },
  {
    title: "Branch updates travel by phone call",
    desc: "Headquarters learns what happened at each branch days later — through calls and chat threads instead of a shared record.",
    icon: MODULE_ICONS["HQ & Branches"],
    color: "#ff6900"
  },
  {
    title: "Attendance and giving are counted on paper",
    desc: "Service attendance, tithes, and offerings are recorded by hand, so trends and errors go unnoticed.",
    icon: MODULE_ICONS["Attendance"],
    color: "#00b8db"
  },
  {
    title: "Reports are assembled by hand",
    desc: "Before every leadership meeting, someone gathers figures from multiple places and hopes they agree.",
    icon: MODULE_ICONS["Reports"],
    color: "#ff2056"
  },
  {
    title: "Members are hard to reach",
    desc: "Announcements and reminders depend on word of mouth — or someone manually texting every member one by one.",
    icon: MODULE_ICONS["SMS Messaging"],
    color: "#fe9a00"
  },
  {
    title: "Follow-up depends on memory",
    desc: "Visitors and absent members are only remembered if someone thinks of them — and many quietly slip through.",
    icon: MODULE_ICONS["Outreach & Follow-up"],
    color: "#00a63e"
  }
];

const PLATFORM_FEATURES = [
  {
    name: "Members",
    color: "#4f39f6",
    icon: MODULE_ICONS["Members"],
    desc: "Complete profiles with contact details, family links, and departments — searchable and always up to date."
  },
  {
    name: "Attendance",
    color: "#ff6900",
    icon: MODULE_ICONS["Attendance"],
    desc: "Record service attendance manually or through shareable check-in links. Trends appear automatically."
  },
  {
    name: "Announcements & SMS",
    color: "#00b8db",
    icon: MODULE_ICONS["Announcements"],
    desc: "Reach the whole church, a branch, or a ministry — schedule messages ahead and track delivery."
  },
  {
    name: "Tithes & Offerings",
    color: "#fe9a00",
    icon: MODULE_ICONS["Offering & Funds"],
    desc: "Record tithes, offerings, welfare, and special funds — every entry linked to a member and a date."
  },
  {
    name: "HQ & Branches",
    color: "#615fff",
    icon: MODULE_ICONS["HQ & Branches"],
    desc: "Each branch manages its own records while headquarters sees the whole network."
  },
  {
    name: "Reports",
    color: "#ff2056",
    icon: MODULE_ICONS["Reports"],
    desc: "Giving, attendance, and branch reports — export to PDF or Excel, share securely, or print."
  },
  {
    name: "Outreach & Follow-up",
    color: "#9810fa",
    icon: MODULE_ICONS["Outreach & Follow-up"],
    desc: "Track visitors and assign follow-ups so no first-timer slips through the cracks."
  },
  {
    name: "Ministries & Departments",
    color: "#01a3ff",
    icon: MODULE_ICONS["Organisations"],
    desc: "Every ministry gets its own space with members and leaders assigned per branch."
  },
  {
    name: "Programs",
    color: "#00a63e",
    icon: MODULE_ICONS["Programs"],
    desc: "Plan services and special programs, with attendance tracked per event."
  },
  {
    name: "Visitors",
    color: "#00bba7",
    icon: MODULE_ICONS["Outreach & Follow-up"],
    desc: "Keep visitor records from first visit through follow-up to membership."
  },
  {
    name: "Fundraising",
    color: "#e12afb",
    icon: MODULE_ICONS["Fundraising"],
    desc: "Track church projects and member pledges all the way to fulfillment."
  },
  {
    name: "Welfare",
    color: "#fb2c36",
    icon: MODULE_ICONS["Welfare"],
    desc: "Record welfare contributions and disbursements with a transparent history."
  },
  {
    name: "Business Ventures",
    color: "#155dfc",
    icon: MODULE_ICONS["Business Ventures"],
    desc: "Track income from church ventures alongside — but separate from — giving."
  },
  {
    name: "General Expenses",
    color: "#f54900",
    icon: MODULE_ICONS["General Expenses"],
    desc: "Log church expenses with categories and a searchable history."
  },
  {
    name: "Financial Overview",
    color: "#193cb8",
    icon: MODULE_ICONS["Financial Overview"],
    desc: "Consolidated income and expense statements ready for leadership review."
  },
  {
    name: "Budgeting",
    color: "#f0b100",
    icon: MODULE_ICONS["Budgeting"],
    desc: "Set budgets per category or period and compare them against actual spending."
  }
];

const TRUST_FEATURES = [
  {
    img: "/trust-audit.jpg",
    alt: "Calculator and financial documents",
    title: "Complete financial audit trail",
    desc: "Every tithe, offering, expense, and disbursement is tied to a record — traceable from entry to report."
  },
  {
    img: "/trust-access.jpg",
    alt: "Person handling financial records on a laptop",
    title: "Restricted finance access",
    desc: "Financial records are visible only to the people whose role grants access — everyone else is locked out."
  },
  {
    img: "/trust-history.jpg",
    alt: "Stream of logged activity data",
    title: "Permanent activity history",
    desc: "Sensitive actions are logged against the person who made them — nothing disappears quietly."
  },
  {
    img: "/trust-roles.jpg",
    alt: "A team organizing work and responsibilities together",
    title: "Role-based permissions",
    desc: "Each admin sees and changes only what their role allows — nothing more."
  },
  {
    img: "/trust-branch.jpg",
    alt: "A network of connected locations seen from above",
    title: "Branch-level access control",
    desc: "Branch teams work inside their own records while HQ keeps the wider view."
  },
  {
    img: "/trust-data.jpg",
    alt: "Circuit board close-up",
    title: "Protected data",
    desc: "Church records stay backed up and recoverable, so nothing your church has built is lost."
  }
];

const ROLES = [
  {
    icon: MODULE_ICONS["HQ & Branches"],
    role: "Pastors & Leadership",
    desc: "Oversight without the chasing — reports, branch views, and the whole church's picture in one place."
  },
  {
    icon: MODULE_ICONS["Settings"],
    role: "Church Administrators",
    desc: "Run the full system — people, branches, finances, messaging, and settings."
  },
  {
    icon: MODULE_ICONS["Tithe"],
    role: "Treasurers & Financial Secretaries",
    desc: "Keep the books — tithes, offerings, funds, expenses, and consolidated statements."
  },
  {
    icon: MODULE_ICONS["Organisations"],
    role: "Youth & Ministry Leaders",
    desc: "Manage their own ministry — members, attendance, programs, and announcements."
  },
  {
    icon: MODULE_ICONS["Members"],
    role: "Cell & Group Leaders",
    desc: "Look after their people — member records, meeting attendance, and follow-ups."
  },
  {
    icon: MODULE_ICONS["Outreach & Follow-up"],
    role: "Evangelism Coordinators",
    desc: "Track outreach — visitor records, converts, and follow-up after services."
  }
];

const TESTIMONIALS = [
  {
    quote: "I used to chase reports from three branches every month. Now I open ChurchClerk and it's all there — attendance, giving, everything.",
    name: "Pastor Francis Andoh",
    detail: "Church Administrator, Precious Church International",
    initials: "FA",
    tone: "bg-blue-100 text-blue-700"
  },
  {
    quote: "Recording offerings used to take a whole afternoon after service. The audit trail alone is worth it — every cedi is accounted for.",
    name: "Elder Adjoa Mensah",
    detail: "Treasurer, Grace Community Chapel",
    initials: "AM",
    tone: "bg-amber-100 text-amber-700"
  },
  {
    quote: "I manage my cell's members and follow-ups myself — no more waiting on the church office for a simple list.",
    name: "Deacon Thabo Mokoena",
    detail: "Cell Group Leader, Living Faith Assembly",
    initials: "TM",
    tone: "bg-emerald-100 text-emerald-700"
  },
  {
    quote: "Our youth ministry keeps its own attendance and sends its own announcements. The young people actually feel seen now.",
    name: "Minister Ngozi Adeleke",
    detail: "Youth Ministry Leader, New Life Tabernacle",
    initials: "NA",
    tone: "bg-violet-100 text-violet-700"
  }
];

const FAQS = [
  {
    q: "Is Church Clerk only for the church administrator?",
    a: "No. Church Clerk is built for every leader in the church — administrators, treasurers, financial secretaries, youth and ministry leaders, cell leaders, and evangelism coordinators each get their own account, scoped to the people and records they're responsible for."
  },
  {
    q: "Does it work for churches with more than one branch?",
    a: "Yes — multi-branch support is core to the product. Each branch keeps its own members, attendance, and finances, while headquarters gets a consolidated view across the whole network."
  },
  {
    q: "How does SMS messaging work?",
    a: "You can send announcements and SMS to your whole church or to specific groups — departments, ministries, visitors, or absent members. Plans include monthly SMS credits, and you can top up from the billing area when you need more."
  },
  {
    q: "What records can we keep in the system?",
    a: "Members and their profiles, departments and ministries, attendance, programs, tithes and offerings, pledges and fundraising, welfare, business ventures, general expenses, budgets — plus consolidated financial statements and reports."
  },
  {
    q: "Who can see our church's financial records?",
    a: "Only the people you allow. Role-based permissions mean each person sees only what their role grants — branch teams see their branch's records, and every sensitive action is logged against the account that made it."
  },
  {
    q: "Can we start small and grow into it?",
    a: "Yes. You can begin on the free plan, add your members and branches gradually, and upgrade whenever your church needs more capacity — your records carry over."
  }
];

const STEPS = [
  {
    title: "Create your account",
    desc: "Sign up free and register your church — no credit card needed to get started."
  },
  {
    title: "Register your church",
    desc: "Set up your headquarters and link every branch, so each location gets its own space in the system."
  },
  {
    title: "Add members & ministries",
    desc: "Build member profiles, assign departments and ministries, and organize your people."
  },
  {
    title: "Run the work",
    desc: "Track attendance, record giving, message members, and pull reports — all from one place."
  }
];

const BENEFITS_LEFT = [
  { icon: MODULE_ICONS["Members"], title: "One record for every member", desc: "Everything your church knows about a person lives on a single profile — no duplicate lists, no outdated spreadsheets." },
  { icon: MODULE_ICONS["Outreach & Follow-up"], title: "Follow-up that doesn't rely on memory", desc: "Visitors and absent members surface automatically, so someone always reaches out before people quietly leave." },
  { icon: MODULE_ICONS["Financial Overview"], title: "Finances leadership can trust", desc: "Tithes, offerings, welfare, and expenses reconcile into one auditable overview — not five separate books." }
];

const BENEFITS_RIGHT = [
  { icon: MODULE_ICONS["HQ & Branches"], title: "Every branch in view", desc: "Headquarters sees the whole network while each branch keeps its own records and its own people." },
  { icon: MODULE_ICONS["Reports"], title: "Reports without the all-nighter", desc: "Attendance, giving, and growth reports generate from records your team already keeps — export and go." },
  { icon: MODULE_ICONS["Announcements"], title: "Reach members in seconds", desc: "Announcements and SMS go out to the whole church or just the group that needs to hear it." }
];

function BenefitCard({ title, desc, icon }) {
  return (
    <div className="flex flex-1 items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.10)] transition-shadow duration-200 hover:shadow-md">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">{icon}</svg>
      </span>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

const FEATURE_ANCHOR = {
  "Members": "members",
  "Attendance": "attendance",
  "Announcements & SMS": "announcements",
  "Tithes & Offerings": "tithe",
  "HQ & Branches": "hq-branches",
  "Reports": "reports",
  "Outreach & Follow-up": "outreach-follow-up",
  "Ministries & Departments": "organisations",
  "Programs": "programs",
  "Visitors": "outreach-follow-up",
  "Fundraising": "fundraising",
  "Welfare": "welfare",
  "Business Ventures": "business-ventures",
  "General Expenses": "general-expenses",
  "Financial Overview": "financial-overview",
  "Budgeting": "budgeting"
};

function LandingPage() {
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
          {/* Off-white backdrop with a faint blue glow — full hero height */}
          <div
            className="absolute inset-x-0 top-0 bottom-0"
            style={{
              backgroundColor: "#f8fafc",
              backgroundImage: "radial-gradient(ellipse 80% 65% at 50% 0%, rgba(37, 99, 235, 0.08), transparent)"
            }}
          />

          <div className="relative mx-auto w-full max-w-5xl px-4 pt-14 md:px-6 md:pt-20">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="currentColor" aria-hidden="true">
                      <path d="M4.6 4.2C5.5 3.4 7 2.9 9 2.9l2.8.3c1.2.2 2.4.9 3.4 1.8.7.7 1.2 1.6 1.8 2.2.8.8 2.4 1.4 3.3 2-.2.4-1.7.5-2.4 1.1-1 .9-1.6 2.3-2 3.7-.4 1.5-.9 2.8-1.7 4-.8 1.3-1.7 2.5-2.8 3.6-.8-.8-1.4-1.8-1.6-2.9-.2-1.3-.4-2.7-.7-3.9-.2-1.1-.7-2.1-1.5-2.8-.4-.4-.6-1-.6-1.6-.6 0-1.4.1-2-.2-1-.5-1.8-1.3-2.1-2.3-.2-.9.3-2.3 1.7-3.7Z" />
                      <path d="M18.9 14.5c.4-.3 1 .1 1.2.8.3 1.2.5 2.5.3 3.7-.1.7-.7 1-1.1.5-.5-1.1-.7-2.6-.7-3.8 0-.5.1-1 .3-1.2Z" />
                    </svg>
                  </span>
                  Made for African Churches
                </span>
                <h1 className="mx-auto mt-6 max-w-3xl text-center text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 md:max-w-none md:text-[3.5rem] lg:text-[4rem]">
                  <span className="md:whitespace-nowrap">One system to manage all your</span>
                  <br className="hidden md:block" />
                  church operations.
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 md:text-lg">
                  Manage members, branches, communication, attendance, giving, and reports from one place — built for the people who keep a church running.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <LandingButton to="/register" size="lg">
                    Get Started
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </LandingButton>
                  <LandingButton to="/contact" state={{ intent: "demo" }} variant="outline" size="lg">
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M5.5 3v2.5M14.5 3v2.5M3.5 8h13M5 5.5h10a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0115 17.5H5A1.5 1.5 0 013.5 16V7A1.5 1.5 0 015 5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Book demo
                  </LandingButton>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Product screenshot — laptop mockup */}
          <div className="relative mx-auto w-full max-w-5xl px-4 pt-10 md:px-6 md:pt-14">
            <HeroScreenshot>
              <div className="relative flex flex-col items-center">
                {/* Laptop lid — dark bezel frame */}
                <div className="relative w-full rounded-t-2xl bg-slate-900 px-2 pb-2 pt-4 shadow-2xl sm:rounded-t-3xl sm:px-3 sm:pb-3 sm:pt-5">
                  {/* Camera */}
                  <div className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-600 sm:top-2" />
                  {/* Screen */}
                  <div className="overflow-hidden rounded-lg bg-white sm:rounded-xl">
                    {/* Browser bar */}
                    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
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
                      className="block h-auto w-full"
                    />
                  </div>
                </div>
                {/* Laptop base — tapered aluminium lip with thumb notch */}
                <div className="relative h-3.5 w-[104%] rounded-b-3xl bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 shadow-md sm:h-4">
                  <div className="mx-auto h-1 w-24 rounded-b-lg bg-slate-400/70 sm:w-32" />
                </div>
                {/* Soft floor shadow */}
                <div className="mx-auto mt-3 h-5 w-[70%] rounded-[100%] bg-slate-900/10 blur-md" aria-hidden="true" />

                {/* Phone mockup — overlapping the laptop's bottom-right corner */}
                <div className="absolute bottom-2 right-0 z-20 w-24 sm:w-32 lg:w-44 xl:translate-x-1/2">
                  <div className="relative rounded-[1.8rem] border border-slate-300 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 p-[3px] shadow-2xl sm:rounded-[2.1rem]">
                    {/* Side buttons */}
                    <span className="absolute -left-[2px] top-[14%] h-7 w-[3px] rounded-l-md bg-slate-400 sm:h-9" aria-hidden="true" />
                    <span className="absolute -left-[2px] top-[26%] h-7 w-[3px] rounded-l-md bg-slate-400 sm:h-9" aria-hidden="true" />
                    <span className="absolute -right-[2px] top-[20%] h-10 w-[3px] rounded-r-md bg-slate-400 sm:h-14" aria-hidden="true" />
                    {/* Inner bezel */}
                    <div className="rounded-[1.55rem] bg-slate-200 p-1 sm:rounded-[1.85rem] sm:p-1.5">
                      {/* Screen */}
                      <div className="relative overflow-hidden rounded-[1.15rem] bg-white sm:rounded-[1.45rem]">
                        <img
                          src="/heroImgMobileV.jpg"
                          alt="The ChurchClerk app on a phone showing the mobile dashboard"
                          className="block h-auto w-full"
                          loading="eager"
                        />
                        {/* Punch-hole camera */}
                        <div className="absolute left-1/2 top-[2%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-900 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                        {/* Home indicator */}
                        <div className="absolute bottom-[2%] left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-slate-900/50 sm:w-10" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </HeroScreenshot>
          </div>
        </section>

        {/* ── THE PROBLEM ── */}
        <section className="bg-blue-50 py-20 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <div className="grid lg:grid-cols-[1fr_0.7fr]">
              <Reveal className="md:px-4">
                <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                  <div className="h-2 aspect-square rounded-full bg-blue-600" />
                  <small className="text-xs font-medium">Problems your church faces</small>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  Church management shouldn't feel chaotic.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-500 md:w-[80%]">
                  The work already gets done — it's just spread across notebooks, spreadsheets, and personal phones. That fragmentation costs time and hides what needs attention.
                </p>
                <ul className="mt-8 grid gap-6">
                  {PROBLEMS.map((p) => (
                    <li key={p.title}>
                      <p className="flex items-center gap-3 font-bold text-slate-900">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: p.color }}>
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">{p.icon}</svg>
                        </span>
                        {p.title}
                      </p>
                      <p className="ml-10 mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <div className="hidden w-full lg:block">
                <img
                  src="/problemImg.jpg"
                  alt="The reality of church administration — scattered records and paperwork"
                  className="h-full w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── PLATFORM FEATURES ── */}
        <section className="bg-white py-28 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:flex md:flex-col md:items-center md:px-6">
            <Reveal>
              <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">Platform Features</small>
              </div>
            </Reveal>
            <Reveal className="md:w-[70%] lg:w-[60%] lg:text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Every feature your church needs.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500 lg:mx-auto lg:w-[80%]">
                One system designed to handle every corner of church administration — no scattered records, no stress.
              </p>
            </Reveal>
            <Reveal className="mt-12 w-full" delay={0.08}>
              <div className="grid divide-y divide-slate-200 rounded-lg border-t border-l border-slate-200 bg-white shadow-xl max-sm:border-r max-sm:border-b md:grid-cols-3 md:divide-x lg:grid-cols-4">
                {PLATFORM_FEATURES.map((f) => (
                  <Link key={f.name} to={`/features#${FEATURE_ANCHOR[f.name]}`} className="block h-full">
                    <div className="flex h-full flex-col justify-between p-5 transition-colors duration-200 hover:bg-blue-50 lg:p-6 lg:pb-7">
                      <div>
                        <div className="grid h-6 aspect-square place-content-center rounded-sm text-white" style={{ backgroundColor: f.color }}>
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">{f.icon}</svg>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-slate-900 lg:mt-3">{f.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                      </div>
                      <span className="mt-4 flex items-center gap-1 text-sm font-medium text-slate-600 underline-offset-4 hover:text-blue-500 hover:underline lg:mt-8">
                        Learn More
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="border-t border-slate-200 bg-white py-24 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">How it works</small>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Getting started is simple.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500 lg:mx-auto lg:w-[85%]">
                No technical background needed — from signup to your first report, the path is simple.
              </p>
            </Reveal>

            <Reveal className="relative mt-14" delay={0.08}>
              {/* Connecting line — desktop only */}
              <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden border-t-2 border-slate-200 lg:block" aria-hidden="true" />
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="relative text-center">
                    <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-base font-bold text-white shadow-md">
                      {i + 1}
                    </div>
                    <h3 className="mt-5 text-base font-bold text-slate-900">{s.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{s.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── BENEFITS ── */}
        <section className="bg-white py-24 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">Why choose ChurchClerk</small>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Benefits for your church.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500 lg:mx-auto lg:w-[85%]">
                Less time on administration, more time on ministry — here's what changes when everything lives in one system.
              </p>
            </Reveal>

            {/* Desktop — 3 cards | circular image | 3 cards, curved connectors */}
            <Reveal className="relative mt-14 hidden lg:grid lg:grid-cols-[1fr_340px_1fr] lg:items-center lg:gap-x-2 lg:gap-y-10">
              {/* Curved arrows flowing from the image to each card */}
              <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full text-slate-500" viewBox="0 0 1000 600" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="benefitArrow" markerWidth="9" markerHeight="9" refX="5.5" refY="4" orient="auto">
                    <path d="M0 0.5 L7 4 L0 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </marker>
                </defs>
                <path d="M415 215 C 380 175 352 130 332 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" markerEnd="url(#benefitArrow)" />
                <path d="M585 215 C 620 175 648 130 668 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" markerEnd="url(#benefitArrow)" />
                <path d="M372 300 C 362 300 350 300 338 300" stroke="currentColor" strokeWidth="3" strokeLinecap="round" markerEnd="url(#benefitArrow)" />
                <path d="M628 300 C 638 300 650 300 662 300" stroke="currentColor" strokeWidth="3" strokeLinecap="round" markerEnd="url(#benefitArrow)" />
                <path d="M415 385 C 380 425 352 470 332 500" stroke="currentColor" strokeWidth="3" strokeLinecap="round" markerEnd="url(#benefitArrow)" />
                <path d="M585 385 C 620 425 648 470 668 500" stroke="currentColor" strokeWidth="3" strokeLinecap="round" markerEnd="url(#benefitArrow)" />
              </svg>

              <div className="relative z-10">
                <BenefitCard {...BENEFITS_LEFT[0]} />
              </div>

              <div className="row-span-3 z-10 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-blue-100/70" aria-hidden="true" />
                  <div className="absolute -inset-6 rounded-full border border-blue-100" aria-hidden="true" />
                  <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-white shadow-2xl">
                    <img
                      src="/benefitImg.jpg"
                      alt="A church leader relieved that administration is handled"
                      className="h-full w-full scale-[1.6] object-cover object-[42%_55%]"
                      style={{ transformOrigin: "42% 55%" }}
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <BenefitCard {...BENEFITS_RIGHT[0]} />
              </div>

              <div className="relative z-10">
                <BenefitCard {...BENEFITS_LEFT[1]} />
              </div>
              <div className="relative z-10">
                <BenefitCard {...BENEFITS_RIGHT[1]} />
              </div>

              <div className="relative z-10">
                <BenefitCard {...BENEFITS_LEFT[2]} />
              </div>
              <div className="relative z-10">
                <BenefitCard {...BENEFITS_RIGHT[2]} />
              </div>
            </Reveal>

            {/* Mobile/tablet — image on top, cards stacked below */}
            <div className="mt-12 flex flex-col items-center gap-4 lg:hidden">
              <div className="relative mb-4">
                <div className="absolute -inset-3 rounded-full bg-blue-100/70" aria-hidden="true" />
                <div className="relative h-44 w-44 overflow-hidden rounded-full border-4 border-white shadow-xl sm:h-52 sm:w-52">
                  <img
                    src="/benefitImg.jpg"
                    alt="A church leader relieved that administration is handled"
                    className="h-full w-full scale-[1.6] object-cover object-[42%_55%]"
                    style={{ transformOrigin: "42% 55%" }}
                  />
                </div>
              </div>
              {[...BENEFITS_LEFT, ...BENEFITS_RIGHT].map((b) => (
                <div key={b.title} className="w-full max-w-md">
                  <BenefitCard {...b} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ACCOUNTABILITY ── */}
        <section className="bg-white py-24 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">Trust &amp; Control</small>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Built for accountability.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500 lg:mx-auto lg:w-[85%]">
                Every action recorded, every role scoped, every branch visible — leadership always knows what happened and who did it.
              </p>
            </Reveal>

            {/* Feature cards — real images, 3 per row */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TRUST_FEATURES.map((t, i) => (
                <Reveal key={t.title} delay={i * 0.05}>
                  <div className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow duration-200 hover:shadow-md">
                    <div className="h-44 overflow-hidden bg-slate-100">
                      <img
                        src={t.img}
                        alt={t.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHO IT'S FOR ── */}
        <section className="border-y border-slate-200 bg-slate-50 py-24 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">Built for every leader</small>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                It's not just for the church administrator.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500 lg:mx-auto lg:w-[85%]">
                Everyone who leads people in your church gets their own account — scoped to the members and records they're responsible for.
              </p>
            </Reveal>

            <div className="mt-16 grid gap-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((r, i) => (
                <Reveal key={r.role} delay={i * 0.05} className="h-full">
                  <div className="relative h-full rounded-2xl border border-slate-200 bg-white px-5 pb-5 pt-8 text-center transition-shadow duration-200 hover:shadow-md">
                    <span className="absolute -top-5 left-1/2 inline-flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">{r.icon}</svg>
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{r.role}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{r.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-8" delay={0.1}>
              <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-slate-500">
                Administrators see everything. <span className="font-semibold text-slate-900">Leaders see only their part</span> — role-based access keeps it that way.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="bg-white py-24 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">Testimonials</small>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Hear it from church leaders.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500 lg:mx-auto lg:w-[85%]">
                The people who keep the church running — in their own words.
              </p>
            </Reveal>

            <Reveal className="relative mt-14 overflow-hidden" delay={0.06}>
              {/* Edge fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-white to-transparent md:w-24" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-white to-transparent md:w-24" aria-hidden="true" />
              <div className="cck-marquee-track flex w-max gap-5 py-1" style={{ animationDuration: "32s" }}>
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                  <figure key={`${t.name}-${i}`} className="flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.08)] md:w-[300px]">
                    <blockquote className="flex-1 text-[13px] leading-relaxed text-slate-600">
                      "{t.quote}"
                    </blockquote>
                    <figcaption className="mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-3">
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${t.tone}`}>
                        {t.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-900">{t.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{t.detail}</p>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── REFERRAL PROGRAM ── */}
        <section className="border-y border-slate-200 bg-white py-24 lg:py-32">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
              <Reveal>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                  <div className="h-2 aspect-square rounded-full bg-blue-600" />
                  <small className="text-xs font-medium">Referral program</small>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  Invite a church, Earn a free month.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-500">
                  Churches already tell other churches about tools that work — ChurchClerk makes it count. Every church gets a unique referral code the moment it joins.
                </p>
                <ul className="mt-10 space-y-8">
                  {[
                    {
                      n: "01",
                      title: "Share your code",
                      desc: "After registering your church, a unique referral code appears in your dashboard — share it with other churches that could use ChurchClerk."
                    },
                    {
                      n: "02",
                      title: "They sign up with it",
                      desc: "The referred church enters your code when registering — and you'll see that church appear in your referral history."
                    },
                    {
                      n: "03",
                      title: "A free month lands on yours",
                      desc: "When the referred church subscribes, a free month is added to your account — applied at your next renewal."
                    }
                  ].map((s) => (
                    <li key={s.n} className="flex gap-5">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* Referral dashboard mock */}
              <Reveal delay={0.08}>
                <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">Referral dashboard</p>
                  </div>
                  <div className="space-y-5 p-6">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Your referral code</p>
                      <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-2.5">
                        <span className="font-mono text-sm font-bold tracking-widest text-blue-700">CC-GRACE-4K2M</span>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-600"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { v: "3", l: "Churches referred" },
                        { v: "2", l: "Months used" },
                        { v: "1", l: "Remaining" }
                      ].map((s) => (
                        <div key={s.l} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
                          <p className="text-lg font-bold text-slate-900">{s.v}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{s.l}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Referral history</p>
                      <ul className="mt-2 divide-y divide-slate-100">
                        {[
                          { name: "Church A", status: "Rewarded" },
                          { name: "Church B", status: "Rewarded" },
                          { name: "Church C", status: "Pending" }
                        ].map((r) => (
                          <li key={r.name} className="flex items-center justify-between py-2.5">
                            <span className="text-sm font-medium text-slate-800">{r.name}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${r.status === "Rewarded" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {r.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="border-t border-slate-200 bg-slate-50 py-20 md:py-28">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Plans that grow with your church.
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Start free. Upgrade when you're ready. No hidden fees, no complicated contracts.
              </p>
            </Reveal>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                {[{ key: "monthly", label: "Monthly" }, { key: "halfYear", label: "6 Months" }, { key: "yearly", label: "Yearly" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setBillingInterval(key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${billingInterval === key ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
                  >{label}</button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Prices shown in <span className="font-semibold text-slate-600">{displayCurrency}</span>
                {fxLoading && <span className="ml-1">(updating…)</span>}
              </p>
            </div>

            <div className="mt-10">
              {loadingPlans && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
                      <div className="h-3.5 w-16 rounded bg-slate-200" />
                      <div className="mt-4 h-7 w-24 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-16 rounded bg-slate-100" />
                      <div className="mt-5 space-y-2.5">
                        {[0, 1, 2, 3, 4].map((j) => (
                          <div key={j} className="h-3 w-full rounded bg-slate-100" />
                        ))}
                      </div>
                      <div className="mt-6 h-10 w-full rounded-lg bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}
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
                    const adminFeatures = Array.isArray(p?.cardFeatures) ? p.cardFeatures.filter(Boolean) : [];
                    const descriptionFeatures = getPlanDescriptionFeatures(p, { max: 5 });
                    const highlights = adminFeatures.length ? adminFeatures : [memberLine, ...descriptionFeatures];
                    const savingsPct = computeSavingsPct(p?.pricing?.GHS || p?.priceByCurrency?.GHS || {}, billingInterval);
                    return (
                      <Reveal key={id} className="h-full" delay={idx * 0.04}>
                        <PriceCard id={id} name={name} price={displayPrice} currency={displayCurrency} per={per} isMostPopular={isMostPopular} savingsPct={savingsPct} memberLimit={memberLimit} description={p?.description} features={highlights} actionLabel="Get started" actionHref="/register" variant="landing" />
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
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-5xl">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-6 py-14 text-center md:px-12">
                {/* Geometric line-art decoration */}
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  {/* Concentric arcs — top left */}
                  <svg viewBox="0 0 200 200" fill="none" className="absolute -left-16 -top-16 h-56 w-56 text-white/10">
                    <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="100" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {/* Diamond grid — bottom right */}
                  <svg viewBox="0 0 200 200" fill="none" className="absolute -bottom-14 -right-14 h-52 w-52 text-white/10">
                    {[0, 1, 2, 3].map((row) =>
                      [0, 1, 2, 3].map((col) => (
                        <rect
                          key={`${row}-${col}`}
                          x={col * 50 + 10}
                          y={row * 50 + 10}
                          width="18"
                          height="18"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          transform={`rotate(45 ${col * 50 + 19} ${row * 50 + 19})`}
                        />
                      ))
                    )}
                  </svg>
                  {/* Cross motif — top right */}
                  <svg viewBox="0 0 24 24" fill="none" className="absolute right-10 top-8 h-10 w-10 text-white/15">
                    <path d="M12 3v18M7 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {/* Dot cluster — bottom left */}
                  <svg viewBox="0 0 80 60" fill="none" className="absolute bottom-8 left-10 h-14 w-20 text-white/15">
                    {[0, 1, 2, 3, 4].map((col) =>
                      [0, 1, 2].map((row) => (
                        <circle key={`${col}-${row}`} cx={col * 16 + 4} cy={row * 16 + 4} r="2" fill="currentColor" />
                      ))
                    )}
                  </svg>
                </div>

                <div className="relative">
                  <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    Your church deserves better tools for the work behind the scenes.
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-blue-100">
                    Start using ChurchClerk to keep your members, branches, giving, and reports in one organized system.
                  </p>
                  <div className="mt-8 flex flex-col items-center justify-center gap-4">
                    <LandingButton to="/register" variant="white" size="lg" className="py-3">
                      Get Started
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </LandingButton>
                    <Link to="/login" className="text-sm font-semibold text-blue-100 hover:text-white transition-colors">
                      Already have an account? Sign in
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-white py-24 lg:py-28">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600/5 px-3 py-1 text-blue-700 outline outline-blue-600/30 lg:mb-6">
                <div className="h-2 aspect-square rounded-full bg-blue-600" />
                <small className="text-xs font-medium">FAQs</small>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Questions churches ask.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500">
                Still unsure about something? <Link to="/contact" className="font-semibold text-blue-700 hover:text-blue-800">Talk to us</Link> — we're happy to help.
              </p>
            </Reveal>
            <Reveal className="mx-auto mt-10 max-w-3xl" delay={0.06}>
              <FaqAccordion items={FAQS} />
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;
