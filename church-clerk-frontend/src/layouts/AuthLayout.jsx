import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

function AuthLayout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${location.pathname}${location.search}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children ?? <Outlet />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AuthLayout;
