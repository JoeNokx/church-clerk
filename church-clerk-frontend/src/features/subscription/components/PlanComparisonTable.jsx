import React, { useMemo, useState } from "react";

function humanizeFeatureKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return "—";
  const label = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

function PlanComparisonTable({
  plans,
  title = "Compare packages",
  subtitle = "Feature availability and limits update automatically as plans change.",
  collapsible = false,
  collapsedCount = 6,
  priorityKeys = [],
  defaultExpanded = false,
  containerClassName = "mt-6 rounded-xl border border-gray-200 bg-white p-5"
}) {
  const rows = Array.isArray(plans) ? plans : [];
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));

  const featureAliases = {
    announcement: "announcements",
    specialFund: "specialFunds"
  };

  const reverseAliases = {
    announcements: ["announcement"],
    specialFunds: ["specialFund"]
  };

  const featureLabels = {
    financeModule: "Finance Module",
    budgeting: "Budgeting",
    branchesOverview: "Branches Overview",
    programsEvents: "Programs & Events",
    reportsAnalytics: "Reports & Analytics",
    supportHelp: "Support & Help"
  };

  const toKey = (k) => featureAliases[String(k || "")] || String(k || "");
  const getFeatures = (p) => (p?.features && typeof p.features === "object" ? p.features : {});

  const getFeatureValue = (plan, key) => {
    const features = getFeatures(plan);

    if (key === "budgeting") {
      if (features?.budgeting !== undefined) return features.budgeting;
      return features?.financeModule;
    }

    if (features?.[key] !== undefined) return features[key];

    const candidates = reverseAliases?.[key] || [];
    for (const alt of candidates) {
      if (features?.[alt] !== undefined) return features[alt];
    }

    return undefined;
  };

  const { sortedKeys, visibleKeys, hiddenCount } = useMemo(() => {
    const labeledKeys = Object.keys(featureLabels);

    const discoveredKeys = Array.from(
      new Set(
        rows.flatMap((p) =>
          Object.keys(getFeatures(p))
            .map(toKey)
            .filter(Boolean)
        )
      )
    );

    const allKeys = Array.from(new Set([...labeledKeys, ...discoveredKeys])).filter(Boolean);

    const sorted = allKeys
      .slice()
      .sort((a, b) => {
        const aLabel = featureLabels[a] || humanizeFeatureKey(a);
        const bLabel = featureLabels[b] || humanizeFeatureKey(b);
        return aLabel.localeCompare(bLabel);
      });

    if (!collapsible || expanded) {
      return { sortedKeys: sorted, visibleKeys: sorted, hiddenCount: 0 };
    }

    const limit = Math.max(0, Number(collapsedCount || 0));
    if (limit === 0) {
      return { sortedKeys: sorted, visibleKeys: [], hiddenCount: sorted.length };
    }

    const normalizedPriority = Array.isArray(priorityKeys)
      ? priorityKeys.map((k) => String(k || "").trim()).filter(Boolean)
      : [];

    const prioritized = normalizedPriority.filter((k) => sorted.includes(k));
    const remainder = sorted.filter((k) => !prioritized.includes(k));

    const vis = [...prioritized, ...remainder].slice(0, limit);
    const hidden = Math.max(0, sorted.length - vis.length);

    return { sortedKeys: sorted, visibleKeys: vis, hiddenCount: hidden };
  }, [rows, collapsible, collapsedCount, expanded, priorityKeys]);

  if (rows.length === 0) return null;

  const renderLimit = (limit) => {
    if (limit === null || limit === undefined) return "Unlimited";
    const n = Number(limit);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString();
  };

  const renderBool = (value, label) => {
    const v = Boolean(value);
    return (
      <span className={v ? "text-green-700" : "text-gray-400"} aria-label={label}>
        {v ? "Yes" : "—"}
      </span>
    );
  };

  const showToggle = Boolean(collapsible && sortedKeys.length > visibleKeys.length);

  return (
    <div className={containerClassName}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
        </div>
        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            See more ({hiddenCount})
          </button>
        ) : collapsible && expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            See less
          </button>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[720px] w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">Feature</th>
              {rows.map((p) => (
                <th key={p?._id || p?.name} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">
                  {p?.name || "—"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="sticky left-0 z-10 bg-white px-4 py-3 text-xs font-semibold text-gray-700 border-b border-gray-100">Member limit</td>
              {rows.map((p) => (
                <td key={`${p?._id || p?.name}-memberLimit`} className="px-4 py-3 text-xs text-gray-700 border-b border-gray-100">
                  <span className="font-semibold">{renderLimit(p?.memberLimit)}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-white px-4 py-3 text-xs font-semibold text-gray-700 border-b border-gray-200">User limit</td>
              {rows.map((p) => (
                <td key={`${p?._id || p?.name}-userLimit`} className="px-4 py-3 text-xs text-gray-700 border-b border-gray-200">
                  <span className="font-semibold">{renderLimit(p?.userLimit)}</span>
                </td>
              ))}
            </tr>

            {visibleKeys.map((k) => (
              <tr key={k}>
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-xs text-gray-700 border-b border-gray-100">{featureLabels[k] || humanizeFeatureKey(k)}</td>
                {rows.map((p) => (
                  <td key={`${p?._id || p?.name}-${k}`} className="px-4 py-3 text-xs text-gray-700 border-b border-gray-100">
                    {renderBool(Boolean(getFeatureValue(p, k)), `${k} ${getFeatureValue(p, k) ? "enabled" : "disabled"}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlanComparisonTable;
