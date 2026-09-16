import { formatMoney } from "../../utils/formatMoney.js";
import { Link } from "react-router-dom";

function formatCurrency(amount, currency) {
  return formatMoney(amount, currency);
}

function PriceCard({
  id,
  name,
  price,
  currency,
  per,
  isMostPopular,
  isCurrent,
  savingsPct,
  memberLimit,
  features,
  actionLabel,
  onAction,
  actionHref,
  disabled,
  loading,
  variant = "billing"
}) {
  const cardClass = variant === "landing"
    ? `relative rounded-2xl bg-white p-6 flex flex-col ${isMostPopular ? "shadow-md ring-2 ring-blue-900" : "shadow-sm ring-1 ring-gray-200"}`
    : `relative rounded-xl border bg-white p-5 ${isCurrent ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"}`;

  const priceClass = variant === "landing" ? "text-3xl font-semibold text-gray-900" : "text-2xl font-semibold text-gray-900";
  const nameClass = variant === "landing" ? "text-lg font-semibold text-gray-900" : "text-sm font-semibold text-gray-900";
  const buttonClass = variant === "landing"
    ? `mt-5 w-full inline-flex justify-center items-center rounded-lg text-sm font-semibold px-4 py-2.5 shadow-sm ${
        isMostPopular
          ? "bg-blue-900 text-white hover:bg-blue-800"
          : "border border-blue-900 text-blue-900 hover:bg-blue-50"
      }`
    : `mt-5 w-full rounded-lg px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 ${
        isCurrent
          ? "bg-gray-100 text-gray-600"
          : "bg-blue-700 text-white hover:bg-blue-800"
      }`;

  return (
    <div key={id} className={cardClass}>
      {isMostPopular ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-900 px-3 py-1 text-[10px] font-semibold text-white">
          Most Popular
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div className={nameClass}>{name || "—"}</div>
        {savingsPct ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
            Save {savingsPct}%
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className={priceClass}>{price !== null ? formatCurrency(price, currency) : "—"}</span>
        <span className="text-gray-500 text-sm">{per}</span>
      </div>

      {variant === "landing" && actionHref ? (
        <Link to={actionHref} className={buttonClass}>
          {actionLabel}
        </Link>
      ) : onAction ? (
        <button
          type="button"
          onClick={() => onAction()}
          disabled={disabled || loading}
          className={buttonClass}
        >
          {loading && (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {actionLabel}
        </button>
      ) : null}

      <div className="mt-4 space-y-2 text-gray-700 text-xs">
        <div>{memberLimit === null ? "Unlimited members" : `Up to ${Number(memberLimit || 0).toLocaleString()} members`}</div>
        {features?.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M6 12.5l3.2 3.2L18 7.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PriceCard;
