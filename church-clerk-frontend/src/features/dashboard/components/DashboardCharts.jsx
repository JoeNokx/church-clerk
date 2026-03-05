import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

function DashboardCharts({ attendanceGraph, genderData, analytics, year }) {
  return (
    <>
      <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Attendance Trends</div>
            <div className="mt-1 text-sm text-gray-600">Sundays attendance totals by month ({year})</div>
          </div>
        </div>

        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceGraph} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} tickFormatter={(v) => String(v || "").slice(0, 3)} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.max(10, Math.ceil((Number(dataMax || 0) || 0) * 1.25))]} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} labelStyle={{ fontWeight: 600, color: "#111827" }} />
              <Line type="monotone" dataKey="totalAttendance" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold text-gray-900">Gender Distribution</div>
        <div className="mt-1 text-sm text-gray-600">Active members breakdown</div>

        <div className="mt-2 h-48 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                {genderData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 p-2.5">
            <div className="text-xs font-semibold text-gray-500">Male</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{analytics?.genderDistribution?.male ?? 0}</div>
            <div className="mt-1 text-xs text-gray-500">{analytics?.genderDistribution?.malePercentage ?? 0}%</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-2.5">
            <div className="text-xs font-semibold text-gray-500">Female</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{analytics?.genderDistribution?.female ?? 0}</div>
            <div className="mt-1 text-xs text-gray-500">{analytics?.genderDistribution?.femalePercentage ?? 0}%</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardCharts;
