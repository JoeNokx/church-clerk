export const resolveSenderId = (church) => {
  const status = String(church?.sender_id_status || "none").trim().toLowerCase();
  const requested = String(church?.sender_id || "").trim();

  if (status === "approved" && requested) {
    return requested;
  }

  const fallback = String(process.env.AFRICA_TALKING_SENDER_ID || "").trim();
  if (fallback) return fallback;

  // Development-only fallback: return null so AT uses its default sender.
  // Sending an unregistered sender ID causes "InvalidSenderId" rejection.
  // In production, this returns null and the controller blocks the send.
  return null;
};
