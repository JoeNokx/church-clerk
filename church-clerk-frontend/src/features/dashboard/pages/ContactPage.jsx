import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", church: "", message: "" });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />
      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl pointer-events-none" />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-16 text-center md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Contact</span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                We'd love to{" "}
                <span className="text-blue-600">hear from you.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                Whether you have a question, need a demo, or want to discuss a custom plan for your church network—we're here to help.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              {/* Form */}
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5 }}>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Send us a message</h2>
                <p className="mt-2 text-sm text-slate-500">Fill out the form below and we'll get back to you within 24 hours.</p>

                {submitted ? (
                  <div className="mt-8 rounded-2xl border border-green-100 bg-green-50 p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-green-800">Message sent!</p>
                        <p className="text-sm text-green-600">Thank you for reaching out. We'll respond shortly.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", church: "", message: "" }); }} className="mt-4 text-sm font-semibold text-green-700 hover:text-green-800 underline underline-offset-2">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Name</label>
                      <input type="text" name="name" required value={form.name} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors" placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Email</label>
                      <input type="email" name="email" required value={form.email} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors" placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Church (optional)</label>
                      <input type="text" name="church" value={form.church} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors" placeholder="Your church name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Message</label>
                      <textarea name="message" required rows={5} value={form.message} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors resize-none" placeholder="How can we help?" />
                    </div>
                    <button type="submit" className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
                      Send Message
                    </button>
                  </form>
                )}
              </motion.div>

              {/* Info */}
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-6">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Email</h3>
                      <p className="mt-1 text-sm text-slate-500">support@churchclerk.com</p>
                      <p className="text-sm text-slate-500">sales@churchclerk.com</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Response time</h3>
                      <p className="mt-1 text-sm text-slate-500">We typically respond within 24 hours, Monday through Friday.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M8 10h8M8 14h5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Ready to start?</h3>
                      <p className="mt-1 text-sm text-slate-500">Skip the wait and create your free account now.</p>
                      <Link to="/register" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                        Create free account →
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

export default ContactPage;
