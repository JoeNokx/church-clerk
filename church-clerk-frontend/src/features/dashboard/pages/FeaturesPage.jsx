import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const FEATURES = [
  { icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>, title: "Member Management", desc: "Complete member profiles with contact info, family links, ministry roles, and status history. Know every person in your congregation." },
  { icon: <><path d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.7"/><path d="M8 13l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "Attendance Tracking", desc: "Record service attendance manually or via shareable check-in links. See trends, identify consistent members, and flag those needing pastoral care." },
  { icon: <><path d="M12 1v22M17 5.5c0-1.9-1.8-3.5-5-3.5S7 3.6 7 5.5 8.8 9 12 9s5 1.6 5 3.5S15.2 16 12 16s-5-1.6-5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>, title: "Giving & Finance", desc: "Track tithes, offerings, income, expenses, welfare, and special funds. Every contribution accounted for with clear, auditable records." },
  { icon: <><path d="M4 19V5M8 19V10M12 19V7M16 19V13M20 19V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>, title: "Reports & Analytics", desc: "Attendance trends, financial summaries, budget vs actuals, and member growth reports—visualized clearly for leadership decisions." },
  { icon: <><path d="M4 10l8-6 8 6M6 10v10h12V10M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "HQ & Branch Management", desc: "One headquarters, multiple branches. Each branch manages its own records while the HQ sees consolidated reports across the network." },
  { icon: <><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "Roles & Permissions", desc: "Control exactly what each team member can view or edit. Full audit logs so leadership always knows who changed what and when." },
  { icon: <><path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "Events & Programs", desc: "Plan services, special events, and ministry programs. Track attendance and engagement per activity with ease." },
  { icon: <><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "Announcements", desc: "Send announcements and updates to your congregation. Keep everyone informed and engaged with targeted messaging." },
  { icon: <><path d="M9 17v-2a4 4 0 00-4-4H3m12 6v-2a4 4 0 014-4h2M9 7a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "Welfare Management", desc: "Track welfare contributions and disbursements. Ensure support reaches those who need it, with full transparency." },
  { icon: <><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 0zM3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>, title: "Communication", desc: "Reach your members through integrated messaging. Send updates, follow-ups, and pastoral care notes directly from the platform." }
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />
      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl pointer-events-none" />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-20 text-center md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Features</span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                Every feature your church{" "}
                <span className="text-blue-600">needs to grow.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                Explore the complete set of tools ChurchClerk provides to help your church manage members, finances, attendance, and more.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.05 }} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:border-blue-100 hover:shadow-md transition-all">
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

        <section className="bg-slate-950 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Start using these features today.</h2>
            <p className="mt-4 text-slate-400">Create your free account and get full access to every feature.</p>
            <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">
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
