import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import MinistryPlusCustomPlanModal from "../../../shared/components/MinistryPlusCustomPlanModal.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { convertGhsToCurrency } from "../../../shared/utils/fx.js";
import { resolveCurrencyFromCountryCode } from "../../../shared/utils/geoCurrency.js";
import PlanComparisonTable from "../../subscription/components/PlanComparisonTable.jsx";

function formatCurrency(amount, currency) {
  return formatMoney(amount, currency);
}

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

  const sectionFade = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 }
  };

  const features = useMemo(() => {
    return [
      {
        title: "People & Community",
        desc: "Members, families, groups, visitors, follow-ups, and clear records—so no one is missed.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "Attendance Tracking",
        desc: "Track services and meetings, see trends, and know who is staying consistent and who needs care.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 12l2.2 2.2L16 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      },
      {
        title: "Announcements & Communication",
        desc: "Share updates with your church easily—services, meetings, and important notices.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M4 10v4a2 2 0 002 2h1l5 4V4L7 8H6a2 2 0 00-2 2Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 8a4 4 0 010 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "Finance & Giving",
        desc: "Tithes, offerings, income, expenses, welfare, projects, and reports—organized and accountable.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M12 1v22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M17 5.5c0-1.9-1.8-3.5-5-3.5S7 3.6 7 5.5 8.8 9 12 9s5 1.6 5 3.5S15.2 16 12 16s-5-1.6-5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "Budgeting",
        desc: "Create budgets and compare what you planned vs what was actually spent—without confusion.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 19V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 19V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M16 19V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M20 19V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "Headquarters & Branches",
        desc: "Manage branches under one headquarters, with clean oversight and clear reporting.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M4 10l8-6 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 10v10h12V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "Roles, Permissions & Audit Log",
        desc: "Control who can do what, and see a clear record of changes—so leaders can trust the system.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      }
    ];
  }, []);

  const getPlanHighlights = (plan) => {
    const rows = [];
    const memberLimit = plan?.memberLimit;
    rows.push(memberLimit === null ? "Unlimited members" : `Up to ${Number(memberLimit || 0).toLocaleString()} members`);

    const featuresObj = plan?.features && typeof plan.features === "object" ? plan.features : {};
    const financeEnabled = Boolean(featuresObj?.financeModule);
    const budgetingEnabled = featuresObj?.budgeting !== undefined ? Boolean(featuresObj.budgeting) : Boolean(featuresObj?.financeModule);

    const candidates = [
      { on: financeEnabled, label: "Finance & giving" },
      { on: budgetingEnabled, label: "Budgeting" },
      { on: Boolean(featuresObj?.branchesOverview), label: "Headquarters & branches" },
      { on: Boolean(featuresObj?.programsEvents), label: "Programs & events" },
      { on: Boolean(featuresObj?.announcements ?? featuresObj?.announcement), label: "Announcements" },
      { on: Boolean(featuresObj?.reportsAnalytics), label: "Reports" }
    ];

    for (const c of candidates) {
      if (c.on && rows.length < 5) rows.push(c.label);
    }

    if (rows.length < 4) {
      rows.push("Member records & attendance");
    }

    return rows.slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0">
            <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute -bottom-56 right-0 h-[520px] w-[520px] rounded-full bg-indigo-600/10 blur-3xl" />
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
              <motion.div initial="hidden" animate="show" variants={sectionFade} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                  <span className="inline-flex h-2 w-2 rounded-full bg-blue-700" />
                  Built by African pastors and church leaders—made for African churches
                </div>

                <h1 className="mt-5 text-3xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
                  Run your church operations with clarity, accountability, and speed.
                </h1>

                <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-xl">
                  ChurchClerk helps you keep your people, finances, and branches organized in one place—so you spend less time chasing records and more time doing ministry.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg bg-blue-900 text-white text-sm font-semibold px-5 py-3 shadow-sm hover:bg-blue-800"
                  >
                    Start Free Trial
                  </Link>
                  <a
                    href="#pricing"
                    className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-gray-300 text-gray-800 text-sm font-semibold px-5 py-3 hover:bg-gray-50"
                  >
                    View Pricing
                  </a>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {["Fast setup", "Headquarters & branches", "Clear accountability"].map((t) => (
                    <div key={t} className="rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-sm font-semibold text-gray-700">
                      {t}
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-3xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="border-b border-gray-200 p-6">
                  <div className="text-sm font-semibold text-gray-900">What you can manage</div>
                  <div className="mt-1 text-xs text-gray-500">A unified system that scales with your church.</div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "Members",
                      "Attendance",
                      "Events",
                      "Announcements",
                      "Headquarters & Branches",
                      "Tithes & Offerings",
                      "Income & Expenses",
                      "Budgeting",
                      "Reports"
                    ].map((item) => (
                      <div key={item} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-blue-900 px-5 py-4 text-white">
                    <div className="text-sm font-semibold">A striking truth</div>
                    <div className="mt-1 text-xs text-white/80">
                      African pastors built this for you—because we understand African church administration: branches, welfare, projects, accountability, and real-life ministry needs.
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-gray-50 border-t border-gray-200">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={sectionFade} transition={{ duration: 0.5 }} className="text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Everything you need—organized by real church workflows</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-3xl mx-auto">
                Built for staff and leaders: clear records, consistent reports, and the flexibility to grow from a small team to multiple branches.
              </p>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, idx) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-6"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-900">{f.icon}</div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-center">
                <div className="lg:col-span-2">
                  <div className="text-lg font-semibold text-gray-900">Designed for trust</div>
                  <div className="mt-2 text-sm text-gray-600">
                    Your church deserves clarity. With roles and permissions, and a record of changes, leaders can trust what they see.
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-start lg:justify-end">
                  <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
                    Create account
                  </Link>
                  <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Why choose ChurchClerk?</div>
                  <div className="mt-2 text-sm text-gray-600">
                    We built this around how churches actually work in Africa: headquarters oversight, branches, welfare support, projects, and accountability.
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-gray-700">
                  {["Headquarters + branch oversight", "Clear giving & spending records", "Simple for admins and leaders", "Grow without losing control"].map((t) => (
                    <div key={t} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="bg-white border-t border-gray-200">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={sectionFade} transition={{ duration: 0.5 }} className="text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">How it works</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">Get started quickly. Your team can be productive in minutes.</p>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create your church",
                  desc: "Register, set up church profile, branches, and your core team roles."
                },
                {
                  step: "02",
                  title: "Add members & services",
                  desc: "Capture member records and track attendance with clear, consistent data."
                },
                {
                  step: "03",
                  title: "Track giving & spending",
                  desc: "Record finance activity, build budgets, and report with confidence."
                }
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                >
                  <div className="text-xs font-semibold text-blue-900">STEP {item.step}</div>
                  <div className="mt-2 text-base font-semibold text-gray-900">{item.title}</div>
                  <div className="mt-2 text-sm text-gray-600">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white border-t border-gray-200">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={sectionFade} transition={{ duration: 0.5 }} className="text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Pricing that scales with your church</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600">Start simple, upgrade when you’re ready.</p>
            </motion.div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBillingInterval("monthly")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === "monthly" ? "bg-blue-900 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("halfYear")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === "halfYear" ? "bg-blue-900 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  6 months
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("yearly")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === "yearly" ? "bg-blue-900 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Yearly
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Display currency: <span className="font-semibold text-gray-700">{displayCurrency}</span>
                {fxLoading ? <span className="ml-2">(updating…)</span> : null}
              </div>
            </div>

            <div className="mt-10">
              {loadingPlans ? (
                <div className="text-center text-sm text-gray-600">Loading plans…</div>
              ) : null}

              {!loadingPlans && plansSorted.length === 0 ? (
                <div className="text-center text-sm text-gray-600">No plans available right now.</div>
              ) : null}

              {!loadingPlans && plansSorted.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
                  {plansSorted.map((p, idx) => {
                    const id = p?._id;
                    const name = String(p?.name || "");
                    const isMostPopular = name.toLowerCase() === "standard";
                    const ghsPrice = p?.pricing?.GHS?.[billingInterval] ?? p?.priceByCurrency?.GHS?.[billingInterval] ?? 0;
                    const displayPrice = Number(ghsPrice || 0) * Number(ghsToVisitorRate || 1);
                    const per = billingInterval === "monthly" ? "/month" : billingInterval === "halfYear" ? "/6 months" : "/year";

                    const highlights = getPlanHighlights(p);

                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.45, delay: idx * 0.04 }}
                        className={`relative rounded-2xl bg-white p-6 flex flex-col ${
                          isMostPopular ? "shadow-md ring-2 ring-blue-900" : "shadow-sm ring-1 ring-gray-200"
                        }`}
                      >
                        {isMostPopular ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-900 px-3 py-1 text-[10px] font-semibold text-white">
                            Most Popular
                          </div>
                        ) : null}

                        <div className="text-lg font-semibold text-gray-900">{name || "—"}</div>
                        <div className="mt-4 flex items-end gap-2">
                          <span className="text-3xl font-semibold text-gray-900">{formatCurrency(displayPrice, displayCurrency)}</span>
                          <span className="text-sm text-gray-500">{per}</span>
                        </div>

                        <div className="mt-6 space-y-2 text-sm text-gray-600">
                          {highlights.map((h) => (
                            <div key={h} className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-700">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                                  <path d="M6 12.5l3.2 3.2L18 7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6">
                          <Link
                            to="/register"
                            className={`w-full inline-flex justify-center items-center rounded-lg text-sm font-semibold px-4 py-2.5 shadow-sm ${
                              isMostPopular
                                ? "bg-blue-900 text-white hover:bg-blue-800"
                                : "border border-blue-900 text-blue-900 hover:bg-blue-50"
                            }`}
                          >
                            Get started
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <PlanComparisonTable
              plans={plansForComparison}
              title="Compare packages"
              subtitle="This table updates automatically as plans change. Tap “See more” to view all features."
              collapsible
              collapsedCount={7}
              priorityKeys={["financeModule", "budgeting", "branchesOverview", "programsEvents", "announcements", "reportsAnalytics"]}
            />

            <div className="mt-10 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
              <div className="text-base font-semibold text-gray-900">Need a fully customized church management solution?</div>
              <div className="mt-2 text-sm text-gray-700">
                With Ministry Plus, get a tailor-made system built specifically for your church’s needs. Features, workflows, and integrations — all designed just for you.
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomPlanModal(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  Contact us for a custom plan
                </button>
              </div>
            </div>

            <MinistryPlusCustomPlanModal open={showCustomPlanModal} onClose={() => setShowCustomPlanModal(false)} defaultEmail="" />
          </div>
        </section>

        <section className="bg-gray-50 border-t border-gray-200">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={sectionFade} transition={{ duration: 0.5 }} className="text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Frequently asked questions</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600">Quick answers for leaders and admins.</p>
            </motion.div>

            <div id="faq" className="mt-10 mx-auto max-w-3xl space-y-3">
              {[
                {
                  key: "security",
                  q: "Is our data secure?",
                  a: "Yes. You can control who can view, create, or edit records—and you can see a clear activity log of important changes."
                },
                {
                  key: "setup",
                  q: "How fast can we set this up?",
                  a: "Most churches can set up their profile, add leaders, create branches, and start recording members within minutes."
                },
                {
                  key: "hq",
                  q: "Can our headquarters oversee multiple branches?",
                  a: "Yes. You can manage branches under one headquarters and still keep reports clear and organized."
                },
                {
                  key: "finance",
                  q: "Can we track giving and expenses without confusion?",
                  a: "Yes. Giving, income, expenses, welfare support, and project spending can be recorded in one place with clear reports."
                },
                {
                  key: "budgeting",
                  q: "Can we set a budget and check what we actually spent?",
                  a: "Yes. Create budgets and compare planned vs actual spending—so the church stays disciplined and accountable."
                },
                {
                  key: "pricing",
                  q: "Can we upgrade later?",
                  a: "Yes. Start with what fits today and upgrade anytime as your church grows."
                },
                {
                  key: "custom",
                  q: "Do you offer custom solutions?",
                  a: "Yes. Ministry Plus provides custom workflows, integrations, and tailored features for your church." 
                }
              ].map((row) => {
                const isOpen = faqOpen === row.key;
                return (
                  <div key={row.key} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFaqOpen((v) => (v === row.key ? "" : row.key))}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="text-sm font-semibold text-gray-900">{row.q}</div>
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path
                            d={isOpen ? "M6 12h12" : "M6 12h12M12 6v12"}
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="px-5 pb-5 text-sm text-gray-600">{row.a}</div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-blue-900">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center">
            <p className="text-white text-lg font-medium">Ready to organize your church records and operations today?</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex justify-center items-center rounded-lg bg-white text-blue-900 text-sm font-semibold px-6 py-3 shadow-sm hover:bg-gray-100"
              >
                Create your account
              </Link>
              <Link
                to="/login"
                className="inline-flex justify-center items-center rounded-lg border border-white/30 bg-white/10 text-white text-sm font-semibold px-6 py-3 shadow-sm hover:bg-white/15"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;
