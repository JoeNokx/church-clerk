import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const VALUES = [
  { title: "Accountability", desc: "Every record, every transaction, every action is traceable. We believe churches deserve systems that build trust, not erode it." },
  { title: "Simplicity", desc: "Technology should serve ministry, not slow it down. ChurchClerk is designed to be intuitive for users of any technical level." },
  { title: "Growth", desc: "We build tools that help churches grow—not just in numbers, but in clarity, stewardship, and impact." },
  { title: "Transparency", desc: "No hidden fees, no locked-in data. Your church's data belongs to your church, always." }
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />
      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl pointer-events-none" />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-20 text-center md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">About Us</span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                Built for churches{" "}
                <span className="text-blue-600">that care about growth.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                ChurchClerk was born from a simple observation: too many churches manage their members, finances, and operations on spreadsheets and paper. We set out to change that.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }} className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Our mission</h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                To give every church—regardless of size or budget—access to a modern, accountable, and easy-to-use management system. We believe that when churches are organized and transparent, they can focus on what matters most: ministry and people.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">What we stand for</h2>
              <p className="mt-4 text-base text-slate-500">The principles that guide everything we build.</p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
              {VALUES.map((v, i) => (
                <motion.div key={v.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.08 }} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Join the churches growing with ChurchClerk.</h2>
            <p className="mt-4 text-slate-400">Start your free account today—no credit card required.</p>
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

export default AboutPage;
