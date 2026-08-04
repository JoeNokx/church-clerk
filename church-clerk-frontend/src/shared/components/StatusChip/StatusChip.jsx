const STATUS_STYLES = {
  active: "border-green-200 bg-green-50 text-green-700",
  dormant: "border-gray-200 bg-gray-100 text-gray-600",
  transferred: "border-blue-200 bg-blue-50 text-blue-700",
  left_church: "border-orange-200 bg-orange-50 text-orange-700",
  deceased: "border-red-200 bg-red-50 text-red-700",
  temporarily_away: "border-yellow-200 bg-yellow-50 text-yellow-700",
  inactive: "border-gray-200 bg-gray-50 text-gray-700",
  visitor: "border-yellow-200 bg-yellow-50 text-yellow-700",
  former: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABELS = {
  left_church: "Left Church",
  temporarily_away: "Temporarily Away",
};

function StatusChip({ value, className = "" }) {
  const v = String(value || "").toLowerCase().replace(/\s+/g, "_");
  const styles = STATUS_STYLES[v] || "border-gray-200 bg-gray-50 text-gray-700";
  const label = STATUS_LABELS[v] || value || "-";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${styles} ${className} text-xs`}>
      {label}
    </span>
  );
}

export default StatusChip;
