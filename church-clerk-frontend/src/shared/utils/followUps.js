// Follow-up assignee helpers — assignedTo is an array of member refs;
// legacy records may still hold a single scalar member.
export function assigneeList(fu) {
  const a = fu?.assignedTo;
  return Array.isArray(a) ? a.filter(Boolean) : a ? [a] : [];
}

export function assigneeNames(fu) {
  return assigneeList(fu)
    .map((m) => `${m?.firstName || ""} ${m?.lastName || ""}`.trim() || m?.name || "")
    .filter(Boolean)
    .join(", ");
}

export function assigneeChips(fu) {
  return assigneeList(fu).map((m) => ({
    _id: m?._id || m,
    name: `${m?.firstName || ""} ${m?.lastName || ""}`.trim() || m?.name || "Member",
  }));
}
