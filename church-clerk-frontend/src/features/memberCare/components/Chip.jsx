const CHIP_STYLES = {
  // case status
  open: "border-blue-200 bg-blue-50 text-blue-700",
  "in-progress": "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-green-200 bg-green-50 text-green-700",
  closed: "border-gray-200 bg-gray-100 text-gray-600",
  // priority
  low: "border-gray-200 bg-gray-50 text-gray-600",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
  // outcomes / prayer status
  improving: "border-green-200 bg-green-50 text-green-700",
  stable: "border-blue-200 bg-blue-50 text-blue-700",
  "needs-attention": "border-amber-200 bg-amber-50 text-amber-700",
  escalated: "border-red-200 bg-red-50 text-red-700",
  "no-contact": "border-gray-200 bg-gray-100 text-gray-600",
  active: "border-blue-200 bg-blue-50 text-blue-700",
  answered: "border-green-200 bg-green-50 text-green-700",
  archived: "border-gray-200 bg-gray-100 text-gray-600"
};

function Chip({ value, label }) {
  const key = String(value || "").toLowerCase();
  const styles = CHIP_STYLES[key] || "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-xs whitespace-nowrap ${styles}`}>
      {label || value || "—"}
    </span>
  );
}

export default Chip;
