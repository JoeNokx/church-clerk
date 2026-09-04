import { resolveIllustration } from "./illustrations.jsx";

/**
 * EmptyState — reusable, production-quality empty state for Church Clerk.
 *
 * Supports:
 *   - contextual illustration (by key string or custom element)
 *   - title + description
 *   - optional primary action (label + onClick)
 *   - optional secondary action
 *   - compact sizing for dashboard cards / charts
 *   - accessibility (decorative illustration hidden, heading hierarchy)
 *   - responsive layout
 *
 * Usage (first-time / zero-data):
 *   <EmptyState
 *     illustration="members"
 *     title="No members yet"
 *     description="Add your first member to start building your church directory."
 *     actionLabel="Add Member"
 *     onAction={openCreate}
 *   />
 *
 * Usage (search no-results):
 *   <EmptyState
 *     illustration="search"
 *     title="No members found"
 *     description="We couldn't find any members matching your search."
 *     actionLabel="Clear Search"
 *     onAction={clearSearch}
 *   />
 *
 * Usage (compact, for dashboard cards / charts):
 *   <EmptyState
 *     compact
 *     illustration="events"
 *     title="No upcoming events"
 *     description="Create an event to start building your church calendar."
 *   />
 */
function EmptyState({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryLabel,
  onSecondary,
  secondaryIcon,
  compact = false,
  size = "md",
  className = "",
  headingLevel = "h3",
}) {
  const ill = resolveIllustration(illustration, compact ? "sm" : size);
  const Heading = headingLevel;

  const wrapPad = compact
    ? "py-6 px-4"
    : "py-12 px-4 md:py-16 md:px-6 lg:py-20";

  const titleSize = compact
    ? "text-sm font-semibold text-gray-700"
    : "text-base md:text-lg font-semibold text-gray-900";

  const descSize = compact
    ? "text-xs text-gray-500"
    : "text-sm text-gray-500";

  const maxW = compact ? "max-w-sm" : "max-w-md";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${wrapPad} ${className}`}
      role="status"
    >
      {ill ? (
        <div className={compact ? "mb-2" : "mb-4"}>{ill}</div>
      ) : null}

      <div className={`mx-auto ${maxW}`}>
        {title ? (
          <Heading className={`${titleSize} leading-snug`}>{title}</Heading>
        ) : null}

        {description ? (
          <p className={`mt-1.5 ${descSize} leading-relaxed`}>{description}</p>
        ) : null}

        {(actionLabel || secondaryLabel) ? (
          <div className={`mt-4 flex flex-wrap items-center justify-center gap-2 ${compact ? "flex-col sm:flex-row" : ""}`}>
            {actionLabel ? (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm transition-colors"
              >
                {actionIcon ? (
                  <span className="inline-flex items-center" aria-hidden="true">{actionIcon}</span>
                ) : null}
                {actionLabel}
              </button>
            ) : null}

            {secondaryLabel ? (
              <button
                type="button"
                onClick={onSecondary}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm transition-colors"
              >
                {secondaryIcon ? (
                  <span className="inline-flex items-center" aria-hidden="true">{secondaryIcon}</span>
                ) : null}
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default EmptyState;
