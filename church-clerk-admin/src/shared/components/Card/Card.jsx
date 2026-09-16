/**
 * Generic card component matching the Outreach Team card design.
 *
 * Structure:
 *   <Card>
 *     <Card.Header icon={...} iconBg="bg-indigo-100" iconColor="text-indigo-700"
 *       title="Name" badge="Active" badgeClass="bg-green-100 text-green-700"
 *       actions={<>...</>}>
 *     </Card.Header>
 *     <Card.Meta items={[{ icon: <Svg/>, label: "5 members" }, ...]} />
 *     <Card.Body>...custom content...</Card.Body>
 *     <Card.Footer>...custom content...</Card.Footer>
 *   </Card>
 */

function Card({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-300 transition-shadow duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon, iconBg = "bg-indigo-100", iconColor = "text-indigo-700", title, badge, badgeClass = "bg-gray-100 text-gray-500", badges, actions }) {
  const renderBadges = badges || (badge ? [{ label: badge, className: badgeClass }] : []);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {icon ? (
          <div className={`h-10 w-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">{title}</div>
          {renderBadges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {renderBadges.map((b, i) => (
                <span key={i} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.className}`}>
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-1 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

function CardMeta({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {item.icon}
          {item.label}
          {i < items.length - 1 ? <span className="text-gray-200 ml-3">·</span> : null}
        </span>
      ))}
    </div>
  );
}

function CardBody({ children, className = "" }) {
  return <div className={`text-sm text-gray-600 ${className}`}>{children}</div>;
}

function CardFooter({ children, className = "" }) {
  return (
    <div className={`mt-auto pt-2 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

/** Default "View Details" link used in the footer */
function CardViewDetailsLink({ onClick, label = "View Details" }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="cck-allow-icons inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
      >
        {label}
      </button>
    </div>
  );
}

Card.Header = CardHeader;
Card.Meta = CardMeta;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.ViewDetailsLink = CardViewDetailsLink;

export default Card;
