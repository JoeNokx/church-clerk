export const resolveSenderId = (church) => {
  const status = String(church?.sender_id_status || "none").trim().toLowerCase();
  const requested = String(church?.sender_id || "").trim();

  if (status === "approved" && requested) {
    return requested;
  }

  const fallback = String(process.env.AT_DEFAULT_SENDER_ID || process.env.AT_SENDER_ID || "").trim();
  return fallback || null;
};
