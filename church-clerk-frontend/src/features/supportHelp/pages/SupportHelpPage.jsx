import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

function SupportHelpPage() {
  const location = useLocation();

  const supportEmails = useMemo(() => ["nokaeldev@gmail.com", "stephenui1864@gmail.com"], []);
  const supportPhones = useMemo(() => ["+233546022758", "+233548592769"], []);
  const whatsappPhone = useMemo(() => "+233546022758", []);

  const categories = useMemo(
    () => ["Billing", "Technical Issue", "Account", "Data", "Feature Request", "Other"],
    []
  );

  const [form, setForm] = useState({
    subject: "",
    category: categories[0] || "Other",
    churchName: "",
    name: "",
    description: ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = useCallback((idx) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  }, []);

  const faqs = useMemo(() => [
    {
      q: "Why can't I see action buttons (Add, Edit, Delete)?",
      a: "Your account may be deactivated or set to read-only by your administrator. Contact your church admin to activate your account or adjust your permissions."
    },
    {
      q: "Why do I see 'Read-only' when switching church context?",
      a: "As a Headquarters admin viewing a branch, your access is view-only. Only a branch admin can make changes to branch data directly."
    },
    {
      q: "How do I change my password?",
      a: "Click your avatar in the top-right corner, select 'Change Password', and follow the prompts. You will need your current password."
    },
    {
      q: "How do I add a new member?",
      a: "Go to Members from the sidebar, then click 'Add Member'. Fill in the required details and click 'Save'. The member will appear in your records immediately."
    },
    {
      q: "Why is my subscription showing as expired or suspended?",
      a: "Your trial or billing period may have ended. Go to Billing & Subscription in Settings to renew or upgrade your plan. During a grace period you can still view data."
    },
    {
      q: "How do I record tithes and offerings?",
      a: "Navigate to Tithes or Offerings from the Finance section in the sidebar. Use 'Add Record' to capture individual or aggregate contributions. You can also attach service type and offering type categories."
    },
    {
      q: "How do I export financial reports?",
      a: "Open Financial Statement or Reports & Analytics, set your desired period and filters, then click 'Export'. You can export as PDF or Excel. Make sure your role has export permissions."
    },
    {
      q: "How do I create an event or program?",
      a: "Go to Programs & Events from the sidebar and click 'Create Event'. Fill in the title, category, date range, time, and venue, then save. The event will appear in the Upcoming tab."
    },
    {
      q: "How do I manage groups, departments, and cells (Ministries)?",
      a: "Go to Ministries in the sidebar. Use the Groups, Departments, and Cells tabs to view and manage each type. Click 'Add' to create a new entry, or use Edit/Delete on any existing record."
    },
    {
      q: "How do I add a branch church?",
      a: "From your Headquarters account, go to Settings and navigate to the Branches section. Click 'Add Branch' and fill in the branch details. Branches can then be viewed from the header context switcher."
    },
    {
      q: "Why is attendance data not showing in charts?",
      a: "Charts require at least one attendance record to be saved. Make sure attendance has been recorded under the Attendance module. Data updates on the dashboard after records are added."
    },
    {
      q: "How do I record visitor information?",
      a: "Go to Attendance from the sidebar and switch to the Visitors tab. Click 'Add Visitor' to log a visitor's details. Visitor counts are tracked separately from regular member attendance."
    },
    {
      q: "Can I recover deleted records?",
      a: "Deleted records cannot be recovered from the system. Please exercise caution when deleting members, transactions, or events. Contact support immediately if a critical record was deleted by mistake."
    },
    {
      q: "How do I update church profile or settings?",
      a: "Go to Settings from the sidebar. You can update church details, currency, logo, and other preferences from the Church Profile tab. Changes take effect immediately."
    }
  ], []);

  useEffect(() => {
    if (!location?.hash) return;
    const id = location.hash.replace("#", "");
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;

    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => clearTimeout(t);
  }, [location?.hash]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage("");

    if (!form.subject.trim() || !form.description.trim()) {
      setSubmitMessage("Please provide a subject and description.");
      return;
    }

    try {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 500));
      setSubmitMessage("Support request submitted. We will get back to you shortly.");
      setForm((prev) => ({
        ...prev,
        subject: "",
        description: ""
      }));
    } catch (err) {
      setSubmitMessage(err?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-5xl">
        <div className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Help &amp; Support</div>
        <div className="mt-1 text-gray-600 text-sm">
          Submit a request or reach out to us using the contact details below.
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-sm">Support Request</div>
            <div className="mt-1 text-gray-500 text-xs">
              Fields marked required should be filled before submitting.
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-gray-700 text-sm">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                  placeholder="E.g. Cannot export report"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 text-sm">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 text-sm">Church Name</label>
                  <input
                    value={form.churchName}
                    onChange={(e) => setField("churchName", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    placeholder="Your church"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 text-sm">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 text-sm">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                  placeholder="Describe the issue in detail..."
                />
              </div>

              {submitMessage ? (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    submitMessage.toLowerCase().includes("submitted")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {submitMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white disabled:opacity-60 text-sm"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-sm">Contact Us</div>
            <div className="mt-1 text-gray-500 text-xs">Choose the fastest way to reach our support team.</div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-900 md:h-12 md:w-12">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">Email</div>
                    <div className="mt-1 text-gray-500 text-xs">Best for screenshots and detailed issues.</div>
                    <div className="mt-2 space-y-1 text-sm">
                      {supportEmails.map((email) => (
                        <div key={email} className="truncate">
                          <a className="text-blue-800 hover:underline" href={`mailto:${email}`}>
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-900 md:h-12 md:w-12">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="M8 3h8v4l-1 2v12H9V9L8 7V3Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path d="M9 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Phone</div>
                        <div className="mt-1 text-gray-500 text-xs">Sunday - Saturday, 9am - 6pm</div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {supportPhones.map((phone) => (
                        <div key={phone} className="truncate">
                          <a className="text-blue-800 hover:underline" href={`tel:${phone}`}>
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-700 md:h-12 md:w-12">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d="M20.52 3.48A11.82 11.82 0 0 0 12 .02C5.37.02.02 5.37.02 12c0 2.11.55 4.16 1.6 5.98L0 24l6.19-1.62A11.9 11.9 0 0 0 12 23.98c6.63 0 11.98-5.35 11.98-11.98 0-3.2-1.25-6.21-3.46-8.52ZM12 21.9c-1.87 0-3.71-.5-5.32-1.44l-.38-.23-3.67.96.98-3.58-.25-.37A9.87 9.87 0 0 1 2.1 12C2.1 6.52 6.52 2.1 12 2.1c2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.91 7c0 5.48-4.42 9.9-9.9 9.9Zm5.73-7.42c-.31-.16-1.83-.9-2.12-1-.29-.1-.5-.16-.71.16-.21.31-.81 1-.99 1.2-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.71-1.71-.97-2.34-.26-.62-.53-.54-.71-.55h-.61c-.21 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.59s1.1 3.01 1.25 3.22c.16.21 2.16 3.29 5.23 4.61.73.31 1.3.5 1.74.64.73.23 1.4.2 1.93.12.59-.09 1.83-.75 2.09-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.36Z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm">WhatsApp</div>
                    <div className="mt-1 text-gray-500 text-xs">Fastest response for quick questions.</div>
                    <a
                      className="mt-3 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-800 hover:bg-gray-50 text-sm"
                      href={`https://wa.me/${String(whatsappPhone || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="truncate">Chat on WhatsApp ({whatsappPhone})</span>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-500">
                        <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M10 7h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="faq" className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8 overflow-hidden">
          <div className="font-semibold text-gray-900 text-sm">Frequently Asked Questions</div>
          <div className="mt-1 text-gray-500 text-xs">Click a question to expand the answer.</div>
          <div className="mt-4 divide-y divide-gray-100">
            {faqs.map((item, idx) => (
              <div key={idx}>
                <button
                  type="button"
                  aria-label={`Toggle FAQ: ${item.q}`}
                  onClick={() => toggleFaq(idx)}
                  className="cck-allow-icons flex w-full items-center justify-between gap-4 py-4 text-left"
                  style={{ whiteSpace: "normal" }}
                >
                  <span className="min-w-0 break-words font-semibold text-gray-900 text-sm">{item.q}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? "max-h-96" : "max-h-0"}`}>
                  <div className="pb-4 text-gray-600 text-sm leading-relaxed break-words">{item.a}</div>
                </div>
              </div>
            ))}{/*
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="font-semibold text-gray-900 text-sm">Why can’t I see action buttons?</div>
              <div className="mt-1 text-gray-600 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="font-semibold text-gray-900 text-sm">Why do I get “Read-only” when switching church?</div>
              <div className="mt-1 text-gray-600 text-sm">
                Some churches are configured as read-only based on your access. You can still view allowed data.
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="font-semibold text-gray-900 text-sm">How do I change my password?</div>
              <div className="mt-1 text-gray-600 text-sm">
                Use the account menu in the top-right corner and select “Change Password”.
              </div>
            </div>*/}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportHelpPage;
