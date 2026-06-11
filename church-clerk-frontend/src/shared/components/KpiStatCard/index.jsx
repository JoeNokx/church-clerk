function KpiStatCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className={`mt-2 font-semibold ${valueClassName ?? "text-gray-900 text-lg"}`}>{value}</div>
    </div>
  );
}

export default KpiStatCard;
