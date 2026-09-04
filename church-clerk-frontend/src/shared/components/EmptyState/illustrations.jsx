/**
 * Contextual illustrations for EmptyState.
 *
 * Each illustration is a lightweight inline SVG rendered inside a subtle
 * circular container. They are intentionally minimal, professional, and
 * consistent — no heavy assets, no new dependencies.
 *
 * Usage:
 *   import { illustrations } from "./illustrations.jsx";
 *   <EmptyState illustration={illustrations.members} ... />
 *
 * Or by key:
 *   <EmptyState illustration="members" ... />
 */

function Wrap({ children, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-50/70 ring-1 ring-inset ring-blue-100/60 ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

const baseIcon = "text-blue-500";

/* ── Members ── */
function Members({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 20c0-3 2-5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M21 20c0-3-2-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 20c0-3 1.8-5 4-5s4 2 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Visitors ── */
function Visitors({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M19 8l1.5 1.5L23 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Attendance ── */
function Attendance({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 8h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Events / Calendar ── */
function Events({ size = "md" }) {
  return <Attendance size={size} />;
}

/* ── Ministries / Groups ── */
function Ministries({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 4v2M5 8l1.5 1M19 8l-1.5 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Outreach ── */
function Outreach({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 11a2 2 0 100-4 2 2 0 000 4Z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </Wrap>
  );
}

/* ── Finance / Transaction ── */
function Finance({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 7l2-3h14l2 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 11v4M10.5 12.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Tithe ── */
function Tithe({ size = "md" }) {
  return <Finance size={size} />;
}

/* ── Offering ── */
function Offering({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 21V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 9c0-2 1.5-3.5 3.5-3.5S19 7 19 9s-1.5 3.5-3.5 3.5S12 11 12 9Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 9c0-2-1.5-3.5-3.5-3.5S5 7 5 9s1.5 3.5 3.5 3.5S12 11 12 9Z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </Wrap>
  );
}

/* ── Expenses ── */
function Expenses({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 7h16M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Income ── */
function Income({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 8a3 3 0 00-3-2h-2a2.5 2.5 0 000 5h2a2.5 2.5 0 010 5h-2a3 3 0 01-3-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Budgeting ── */
function Budgeting({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 19V5M8 19V10M12 19V7M16 19V13M20 19V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Welfare ── */
function Welfare({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 21s-6-4.5-6-10a4 4 0 018-1 4 4 0 018 1c0 5.5-6 10-6 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" transform="translate(-2 0)" />
        <path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Pledge ── */
function Pledge({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Special Fund ── */
function SpecialFund({ size = "md" }) {
  return <Pledge size={size} />;
}

/* ── Notifications ── */
function Notifications({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Announcements / Communication ── */
function Announcements({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M3 11l16-6v14L3 13v-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3 13v4a1 1 0 001 1h2v-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M19 9v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Projects ── */
function Projects({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 10l8-6 8 6M6 10v10h12V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Business Ventures ── */
function BusinessVentures({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 20h16M5 20V9l7-5 7 5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Referrals ── */
function Referrals({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M9 12a3 3 0 100-6 3 3 0 000 6Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 20c0-3 2.5-5 6-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 8l4 4-4 4M20 12h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Support / Help ── */
function Support({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M12 20a8 8 0 100-16 8 8 0 000 16Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="0.8" fill="currentColor" />
      </svg>
    </Wrap>
  );
}

/* ── Settings ── */
function Settings({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Search / No results ── */
function Search({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Filters ── */
function Filters({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="5" r="2" fill="white" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="17" cy="12" r="2" fill="white" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10" cy="19" r="2" fill="white" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </Wrap>
  );
}

/* ── Date / Calendar filter ── */
function Date({ size = "md" }) {
  return <Attendance size={size} />;
}

/* ── Chart / Analytics ── */
function Chart({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 19V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 16v-4M12 16V8M16 16v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Generic / Default ── */
function Generic({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Birthdays ── */
function Birthdays({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M5 21h14v-7H5v7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M5 14c0-3 2-5 7-5s7 2 7 5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 9V5M10 5c0-1 2-2 2-2s2 1 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 17v2M15 17v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Approvals / Governance ── */
function Approvals({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </Wrap>
  );
}

/* ── Wallet ── */
function Wallet({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 7l2-3h12l2 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="17" cy="13" r="1.5" fill="currentColor" />
      </svg>
    </Wrap>
  );
}

/* ── Billing ── */
function Billing({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M5 3h10l4 4v14a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Templates ── */
function Templates({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Messages ── */
function Messages({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Teams ── */
function Teams({ size = "md" }) {
  return <Ministries size={size} />;
}

/* ── People Reached ── */
function PeopleReached({ size = "md" }) {
  return <Visitors size={size} />;
}

/* ── Follow-Ups ── */
function FollowUps({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Reports ── */
function Reports({ size = "md" }) {
  return <Chart size={size} />;
}

/* ── Financial Statement ── */
function FinancialStatement({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M5 3h10l4 4v14H5V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Audit Logs ── */
function AuditLogs({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M9 4h6M9 4v4h6V4M7 8h10l-1 12H8L7 8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 13v3M14 13v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Users / Roles ── */
function Users({ size = "md" }) {
  return <Members size={size} />;
}

/* ── Payment Methods ── */
function PaymentMethods({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

/* ── Contributions ── */
function Contributions({ size = "md" }) {
  return <Offering size={size} />;
}

/* ── Attendees ── */
function Attendees({ size = "md" }) {
  return <Members size={size} />;
}

/* ── Files ── */
function Files({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

/* ── Delivery ── */
function Delivery({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M3 8h11v8H3V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M14 11h4l3 3v2h-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </Wrap>
  );
}

/* ── Pipeline ── */
function Pipeline({ size = "md" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <Wrap className={s}>
      <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${baseIcon}`}>
        <path d="M4 6h4v12H4V6ZM10 6h4v12h-4V6ZM16 9h4v9h-4V9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </Wrap>
  );
}

export const illustrations = {
  members: Members,
  visitors: Visitors,
  attendance: Attendance,
  events: Events,
  ministries: Ministries,
  outreach: Outreach,
  finance: Finance,
  tithe: Tithe,
  offering: Offering,
  expenses: Expenses,
  income: Income,
  budgeting: Budgeting,
  welfare: Welfare,
  pledge: Pledge,
  specialFund: SpecialFund,
  notifications: Notifications,
  announcements: Announcements,
  projects: Projects,
  businessVentures: BusinessVentures,
  referrals: Referrals,
  support: Support,
  settings: Settings,
  search: Search,
  filters: Filters,
  date: Date,
  chart: Chart,
  generic: Generic,
  birthdays: Birthdays,
  approvals: Approvals,
  wallet: Wallet,
  billing: Billing,
  templates: Templates,
  messages: Messages,
  teams: Teams,
  peopleReached: PeopleReached,
  followUps: FollowUps,
  reports: Reports,
  financialStatement: FinancialStatement,
  auditLogs: AuditLogs,
  users: Users,
  paymentMethods: PaymentMethods,
  contributions: Contributions,
  attendees: Attendees,
  files: Files,
  delivery: Delivery,
  pipeline: Pipeline,
};

/**
 * Resolve an illustration prop that may be a key string or a component.
 * Returns a renderable element.
 */
export function resolveIllustration(illustration, size) {
  if (!illustration) return null;
  if (typeof illustration === "string") {
    const Comp = illustrations[illustration] || illustrations.generic;
    return <Comp size={size} />;
  }
  // If it's already an element, return as-is
  return illustration;
}

export default illustrations;
