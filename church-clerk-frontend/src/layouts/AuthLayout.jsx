import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

function AuthIllustration() {
  return (
    <svg viewBox="0 0 440 400" fill="none" className="max-h-[55vh] w-full max-w-md" aria-hidden="true">
      {/* ambient circle */}
      <circle cx="220" cy="200" r="150" fill="white" opacity="0.07" />
      <circle cx="220" cy="200" r="190" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="3 10" />

      {/* clouds */}
      <g fill="white" opacity="0.9">
        <ellipse cx="70" cy="80" rx="34" ry="16" />
        <ellipse cx="96" cy="70" rx="24" ry="13" />
        <ellipse cx="372" cy="56" rx="30" ry="14" />
        <ellipse cx="348" cy="46" rx="20" ry="11" />
        <ellipse cx="404" cy="120" rx="22" ry="10" opacity="0.7" />
      </g>

      {/* floating card — attendance check */}
      <g>
        <rect x="46" y="150" width="74" height="52" rx="12" fill="white" />
        <circle cx="66" cy="176" r="11" fill="#DCFCE7" />
        <path d="M61 176l3.5 3.5L72 172" stroke="#16A34A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="82" y="168" width="26" height="5" rx="2.5" fill="#BFDBFE" />
        <rect x="82" y="178" width="18" height="5" rx="2.5" fill="#E2E8F0" />
      </g>

      {/* floating card — giving */}
      <g>
        <rect x="318" y="186" width="74" height="52" rx="12" fill="white" />
        <circle cx="338" cy="212" r="11" fill="#FEF3C7" />
        <path d="M338 206v12M334 208.5h6.5a2.5 2.5 0 010 5h-5a2.5 2.5 0 000 5h6.5" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="354" y="204" width="26" height="5" rx="2.5" fill="#BFDBFE" />
        <rect x="354" y="214" width="18" height="5" rx="2.5" fill="#E2E8F0" />
      </g>

      {/* floating card — message bubble */}
      <g>
        <rect x="316" y="96" width="60" height="44" rx="12" fill="white" />
        <path d="M330 118 h2 l4 -6 h22 a 4 4 0 0 0 4 -4 v0 a 4 4 0 0 0 -4 -4 h-24 a 6 6 0 0 0 -6 6 v6 a 2 2 0 0 0 2 2 Z" fill="#DBEAFE" transform="translate(-2 0)" />
        <circle cx="340" cy="118" r="2.4" fill="#3B82F6" />
        <circle cx="348" cy="118" r="2.4" fill="#93C5FD" />
        <circle cx="356" cy="118" r="2.4" fill="#BFDBFE" />
      </g>

      {/* ground shadow */}
      <ellipse cx="220" cy="336" rx="150" ry="12" fill="white" opacity="0.1" />

      {/* church building */}
      <g>
        {/* steeple */}
        <rect x="206" y="150" width="28" height="52" rx="4" fill="white" />
        <path d="M194 152 L220 122 L246 152 Z" fill="#BFDBFE" />
        <rect x="218.5" y="96" width="3.5" height="20" rx="1.75" fill="white" />
        <rect x="212" y="102" width="16.5" height="3.5" rx="1.75" fill="white" />
        {/* main hall */}
        <rect x="164" y="212" width="112" height="112" rx="8" fill="white" />
        <path d="M152 214 L220 168 L288 214 Z" fill="#DBEAFE" />
        {/* windows */}
        <rect x="176" y="240" width="16" height="26" rx="8" fill="#93C5FD" />
        <rect x="248" y="240" width="16" height="26" rx="8" fill="#93C5FD" />
        <rect x="216" y="196" width="8" height="8" rx="4" fill="#3B82F6" opacity="0.8" />
        {/* arched door */}
        <path d="M204 324 v-34 a 16 16 0 0 1 32 0 v34 Z" fill="#2563EB" />
        <rect x="204" y="316" width="32" height="8" rx="3" fill="#1D4ED8" />
      </g>

      {/* person — left */}
      <g>
        <circle cx="132" cy="288" r="13" fill="#F2C9A4" />
        <path d="M118 336 v-16 a14 14 0 0128 0 v16 Z" fill="#FBBF24" />
        <rect x="118" y="330" width="28" height="6" rx="3" fill="#F59E0B" />
      </g>

      {/* person — right */}
      <g>
        <circle cx="308" cy="292" r="13" fill="#8D5524" />
        <path d="M294 340 v-16 a14 14 0 0128 0 v16 Z" fill="#93C5FD" />
        <rect x="294" y="334" width="28" height="6" rx="3" fill="#60A5FA" />
      </g>

      {/* sparkles */}
      <g fill="white">
        <path d="M120 236 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2-5.4 -5.4-2.2 5.4-2.2Z" opacity="0.85" />
        <path d="M330 270 l1.8 4.4 4.4 1.8 -4.4 1.8 -1.8 4.4 -1.8-4.4 -4.4-1.8 4.4-1.8Z" opacity="0.6" />
        <circle cx="360" cy="150" r="3" opacity="0.5" />
        <circle cx="90" cy="230" r="3" opacity="0.5" />
      </g>
    </svg>
  );
}

function AuthLayout({ children }) {
  const location = useLocation();

  return (
    <div className="grid min-h-screen bg-white lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      {/* Form side */}
      <div className="flex min-h-screen flex-col items-center px-6 lg:h-full lg:min-h-0 lg:overflow-y-auto no-scrollbar">
        <div className="my-auto w-full max-w-[420px] py-12 lg:py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${location.pathname}${location.search}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {children ?? <Outlet />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Illustration side — inset panel with white frame on top/right/bottom */}
      <div className="hidden lg:block lg:py-4 lg:pr-4">
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-12">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" aria-hidden="true" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            <AuthIllustration />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            className="relative mt-8 max-w-sm text-center"
          >
            <p className="text-xl font-bold tracking-tight text-white">One system to manage all your church operations.</p>
            <p className="mt-2 text-sm leading-relaxed text-blue-100">
              Members, branches, finances, attendance, SMS communication, outreach, and reports — all in one place.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
