import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import PriceCard from "../../../shared/components/PriceCard/index.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import { convertGhsToCurrency } from "../../../shared/utils/fx.js";
import { resolveCurrencyFromCountryCode } from "../../../shared/utils/geoCurrency.js";
import { getPlanDescriptionFeatures } from "../../../shared/utils/planDescription.js";

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function ComingSoonPage() {
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [visitorCurrency, setVisitorCurrency] = useState("GHS");
  const [ghsToVisitorRate, setGhsToVisitorRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);
  const heroImgRef = useRef(null);
  const [imgHalfHeight, setImgHalfHeight] = useState(0);

  const measureImg = () => {
    if (heroImgRef.current) {
      setImgHalfHeight(heroImgRef.current.offsetHeight / 2);
    }
  };

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

  useEffect(() => {
    measureImg();
    window.addEventListener("resize", measureImg);
    return () => window.removeEventListener("resize", measureImg);
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

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <main>
        {/* ── HERO ── */}
        <section className="relative rounded-b-[3rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
          {/* Decorative background layer (clipped) */}
          <div className="absolute inset-0 overflow-hidden rounded-b-[3rem] pointer-events-none">
            {/* Futuristic glowing orbs */}
            <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
            <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-cyan-500/15 blur-[100px]" />
            <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full bg-indigo-500/15 blur-[100px]" />

            {/* Futuristic grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
                maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)"
              }}
            />

            {/* Futuristic top glow line */}
            <div className="absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
          </div>

          {/* Header inside hero */}
          <LandingHeader />

          {/* Centered text content */}
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-10 pb-10 text-center md:pt-14 md:pb-16 md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <h1 className="font-bold leading-tight tracking-tight text-white" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
                Run your entire church{" "}
                <span className="text-blue-100">from one platform.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-5xl text-base leading-relaxed text-blue-50/90 md:text-lg" style={{ maxWidth: "100%" }}>
                ChurchClerk gives pastors, administrators, and finance teams a single place to manage members, attendance, giving, ministries, and branch operations—with complete accountability.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition-colors">
                  Create Free Account
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link to="/login" className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
                  Login
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Hero image — 3D laptop mockup, straddles hero and pricing */}
          <div className="relative z-20 mx-auto w-full max-w-5xl px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              {/* Laptop screen */}
              <div className="relative rounded-t-2xl rounded-b-md border border-slate-300/40 bg-slate-800 p-2 shadow-2xl" style={{ transform: "perspective(1200px) rotateX(8deg)" }}>
                {/* Screen bezel */}
                <div className="relative overflow-hidden rounded-lg bg-black">
                  {/* Browser titlebar */}
                  <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex flex-1 items-center gap-2 rounded-md bg-slate-800 px-3 py-1 max-w-sm mx-auto">
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-slate-500">
                        <path d="M8 1a4 4 0 00-4 4v1H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm0 1.5A2.5 2.5 0 0110.5 5v1h-5V5A2.5 2.5 0 018 2.5z" fill="currentColor" />
                      </svg>
                      <span className="text-xs font-mono text-slate-400 truncate">app.churchclerkapp.com/dashboard</span>
                    </div>
                  </div>
                  {/* Screenshot */}
                  <img
                    ref={heroImgRef}
                    src="/hero image (3).png"
                    alt="ChurchClerk Dashboard"
                    className="block w-full"
                    onLoad={measureImg}
                  />
                </div>
              </div>
              {/* Laptop base */}
              <div className="relative mx-auto h-4 w-full rounded-b-xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg" style={{ transform: "perspective(1200px) rotateX(8deg)" }}>
                {/* Notch */}
                <div className="absolute left-1/2 top-0 h-1.5 w-16 -translate-x-1/2 rounded-b-md bg-slate-500" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── PRICING ── white bg pulled up to cover bottom half of hero image */}
        <section
          className="relative z-10 bg-white"
          style={{ marginTop: imgHalfHeight > 0 ? `-${imgHalfHeight}px` : undefined, paddingTop: imgHalfHeight > 0 ? `${imgHalfHeight + 80}px` : "80px" }}
        >
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
              {loadingPlans && <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2"><Spinner size="sm" className="text-slate-400" /> Loading plans…</div>}
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

            <div className="mt-10 text-center">
              <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                See full pricing details
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
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
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
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

export default ComingSoonPage;
