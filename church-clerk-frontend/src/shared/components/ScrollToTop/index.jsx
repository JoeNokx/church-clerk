import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Floating "back to top" button — appears after scrolling past a threshold.
 * `cck-allow-icons` opts out of the global mobile rule that hides button icons.
 */
function ScrollToTop({ threshold = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="cck-allow-icons fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:bottom-6 sm:right-6"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default ScrollToTop;
