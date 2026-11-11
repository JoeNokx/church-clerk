export const CASE_CATEGORIES = [
  { value: "illness", label: "Illness" },
  { value: "hospitalization", label: "Hospitalization" },
  { value: "bereavement", label: "Bereavement" },
  { value: "new-baby", label: "New Baby" },
  { value: "family-crisis", label: "Family Crisis" },
  { value: "financial-hardship", label: "Financial Hardship" },
  { value: "spiritual-support", label: "Spiritual Support" },
  { value: "counseling", label: "Counseling" },
  { value: "other", label: "Other" }
];

export const CASE_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

export const CASE_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

export const CASE_SOURCES = [
  { value: "self-reported", label: "Self Reported" },
  { value: "leader-referral", label: "Leader Referral" },
  { value: "family-referral", label: "Family Referral" },
  { value: "pastoral-observation", label: "Pastoral Observation" },
  { value: "other", label: "Other" }
];

export const VISIT_TYPES = [
  { value: "home-visit", label: "Home Visit" },
  { value: "hospital-visit", label: "Hospital Visit" },
  { value: "phone-call", label: "Phone Call" },
  { value: "counseling-session", label: "Counseling Session" },
  { value: "prayer", label: "Prayer" },
  { value: "other", label: "Other" }
];

export const VISIT_OUTCOMES = [
  { value: "improving", label: "Improving" },
  { value: "stable", label: "Stable" },
  { value: "needs-attention", label: "Needs Attention" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "no-contact", label: "No Contact" }
];

export const PRAYER_CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "family", label: "Family" },
  { value: "finances", label: "Finances" },
  { value: "guidance", label: "Guidance" },
  { value: "thanksgiving", label: "Thanksgiving" },
  { value: "bereavement", label: "Bereavement" },
  { value: "other", label: "Other" }
];

export const PRAYER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "answered", label: "Answered" },
  { value: "archived", label: "Archived" }
];

export const labelFor = (list, value) =>
  list.find((o) => o.value === value)?.label || value || "—";

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export const memberName = (m) =>
  `${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—";
