import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

function AuthLayout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen">

      {/* Fixed background: church image */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/church login.png')" }}
      />

      {/* Fixed dark gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/90 via-slate-900/85 to-indigo-950/92" />

      {/* Fixed dot-grid texture */}
      <div
        className="fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Fixed ambient glow blobs */}
      <div className="fixed -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-32 h-[480px] w-[480px] rounded-full bg-indigo-700/15 blur-3xl pointer-events-none" />

      {/* Scrollable content wrapper */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[460px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${location.pathname}${location.search}`}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="rounded-2xl bg-white px-8 py-10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/10 md:px-10 md:py-12"
          >
            {children ?? <Outlet />}
          </motion.div>
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}

export default AuthLayout;
