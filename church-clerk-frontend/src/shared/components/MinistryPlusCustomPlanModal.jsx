import { useEffect, useState } from "react";

function ModalShell({ open, title, subtitle, onClose, children, maxWidthClass = "max-w-2xl" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClass} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-gray-600">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function MinistryPlusCustomPlanModal({ open, onClose, defaultEmail = "" }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubmitMessage("");
    setEmail(String(defaultEmail || ""));
    setPhone("");
    setMessage("");
  }, [defaultEmail, open]);

  return (
    <ModalShell
      open={open}
      title="Ministry Plus - Custom Plan"
      subtitle="Tell us what you need and our team will reach out."
      onClose={() => {
        if (submitting) return;
        onClose?.();
      }}
      maxWidthClass="max-w-2xl"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitMessage("");

          const nextEmail = String(email || "").trim();
          const nextPhone = String(phone || "").trim();
          const nextMessage = String(message || "").trim();
          if (!nextEmail || !nextPhone || !nextMessage) {
            setSubmitMessage("Please provide your email, mobile number, and message.");
            return;
          }

          try {
            setSubmitting(true);
            await new Promise((r) => setTimeout(r, 600));
            setSubmitMessage("Submitted successfully. We will contact you shortly.");
          } catch (err) {
            setSubmitMessage(err?.message || "Failed to submit.");
          } finally {
            setSubmitting(false);
          }
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="0546022758"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe the features, workflows, and integrations you need..."
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>

        {submitMessage ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              submitMessage.toLowerCase().includes("success")
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {submitMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">Contact details</div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <a
              href="https://wa.me/233546022758"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M20.52 3.48A11.82 11.82 0 0 0 12 .02C5.37.02.02 5.37.02 12c0 2.11.55 4.16 1.6 5.98L0 24l6.19-1.62A11.9 11.9 0 0 0 12 23.98c6.63 0 11.98-5.35 11.98-11.98 0-3.2-1.25-6.21-3.46-8.52ZM12 21.9c-1.87 0-3.71-.5-5.32-1.44l-.38-.23-3.67.96.98-3.58-.25-.37A9.87 9.87 0 0 1 2.1 12C2.1 6.52 6.52 2.1 12 2.1c2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.91 7c0 5.48-4.42 9.9-9.9 9.9Zm5.73-7.42c-.31-.16-1.83-.9-2.12-1-.29-.1-.5-.16-.71.16-.21.31-.81 1-.99 1.2-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.71-1.71-.97-2.34-.26-.62-.53-.54-.71-.55h-.61c-.21 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.59s1.1 3.01 1.25 3.22c.16.21 2.16 3.29 5.23 4.61.73.31 1.3.5 1.74.64.73.23 1.4.2 1.93.12.59-.09 1.83-.75 2.09-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.36Z" />
                </svg>
              </span>
              <span className="truncate">WhatsApp (0546022758)</span>
            </a>

            <a
              href="tel:0546022758"
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M9.2 6.6c.3-.8.6-1 1.4-1h2.8c.8 0 1.1.2 1.4 1l.6 1.6c.2.6.1 1-.4 1.4l-1.2 1c.7 1.4 1.8 2.5 3.2 3.2l1-1.2c.4-.5.8-.6 1.4-.4l1.6.6c.8.3 1 .6 1 1.4v2.8c0 .8-.2 1.1-1 1.4-1 .4-2 .6-3 .6-7.2 0-13-5.8-13-13 0-1 .2-2 .6-3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="truncate">Phone (0546022758)</span>
            </a>

            <a
              href="mailto:josephyankey06@gmail.com"
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-900">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="truncate">Email (josephyankey06@gmail.com)</span>
            </a>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
