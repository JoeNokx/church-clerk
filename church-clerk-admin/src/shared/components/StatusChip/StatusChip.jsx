function StatusChip({ value, className = "" }) {
  const v = String(value || "").toLowerCase();
  const styles =
    v === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : v === "inactive"
        ? "border-gray-200 bg-gray-50 text-gray-700"
        : v === "visitor"
          ? "border-yellow-200 bg-yellow-50 text-yellow-700"
          : v === "former"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles} ${className}`}>
      {v || "-"}
    </span>
  );
}

export default StatusChip;
