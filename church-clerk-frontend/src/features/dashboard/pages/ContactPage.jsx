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
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-24 pb-16 text-center md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                We'd love to hear from you.
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-slate-500 md:text-xl">
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

              {/* Info — translucent blocks over image */}
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} transition={{ duration: 0.5, delay: 0.1 }}>
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src="/church login.jpg"
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/55" />

                  <div className="relative mx-auto max-w-md space-y-4 px-6 py-8 md:px-0 md:py-10">
                    <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-white">Email</h3>
                          {["support@churchclerk.com", "sales@churchclerk.com"].map((email) => (
                            <a key={email} href={`mailto:${email}`} className="group mt-1.5 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
                              {email}
                              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-white">
                                <path d="M6 14L14 6M8 6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-white">Phone</h3>
                          <a href="tel:+233000000000" className="group mt-1.5 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
                            +233 00 000 0000
                            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-white">
                              <path d="M6 14L14 6M8 6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.03a8.1 8.1 0 01-4.13-1.13l-.3-.18-3.07.81.82-2.99-.2-.31a8.06 8.06 0 01-1.24-4.32c0-4.45 3.62-8.07 8.08-8.07 2.15 0 4.18.84 5.7 2.37a8.02 8.02 0 012.37 5.7c0 4.46-3.62 8.09-8.03 8.09zm4.43-6.05c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.59 4.11 3.63.57.25 1.02.39 1.37.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28z"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-white">WhatsApp</h3>
                          <a href="https://wa.me/233000000000" target="_blank" rel="noreferrer" className="group mt-1.5 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
                            +233 00 000 0000
                            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-white">
                              <path d="M6 14L14 6M8 6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                            <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">Response time</h3>
                          <p className="mt-1 text-sm text-slate-200">We typically respond within 24 hours, Monday through Friday.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="M8 10h8M8 14h5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">Ready to start?</h3>
                          <p className="mt-1 text-sm text-slate-200">Skip the wait and create your free account now.</p>
                          <Link to="/register" className="group mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 transition-colors hover:text-white">
                            Create free account
                            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
                              <path d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" fill="currentColor" />
                            </svg>
                          </Link>
                        </div>
                      </div>
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
