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

export const APPOINTMENT_TYPES = [
  { value: "counseling-session", label: "Counseling Session" },
  { value: "pastoral-appointment", label: "Pastoral Appointment" }
];

export const APPOINTMENT_CATEGORIES = [
  { value: "premarital", label: "Premarital" },
  { value: "marriage", label: "Marriage" },
  { value: "grief", label: "Grief" },
  { value: "spiritual-direction", label: "Spiritual Direction" },
  { value: "crisis", label: "Crisis" },
  { value: "dedication", label: "Dedication" },
  { value: "baptism-prep", label: "Baptism Preparation" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" }
];

export const APPOINTMENT_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No Show" },
  { value: "rescheduled", label: "Rescheduled" }
];

export const APPOINTMENT_LOCATIONS = [
  { value: "church-office", label: "Church Office" },
  { value: "home", label: "Home" },
  { value: "hospital", label: "Hospital" },
  { value: "online", label: "Online" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" }
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
