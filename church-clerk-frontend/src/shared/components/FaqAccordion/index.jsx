import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Shared FAQ accordion for landing pages.
 * items: [{ q: string, a: string }]
 */
function FaqAccordion({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? -1 : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50 md:px-6 md:py-5"
            >
              <span className="text-sm font-semibold text-slate-900 md:text-base">{item.q}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-blue-600" : "text-slate-400"}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500 md:px-6 md:text-[15px]">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default FaqAccordion;
