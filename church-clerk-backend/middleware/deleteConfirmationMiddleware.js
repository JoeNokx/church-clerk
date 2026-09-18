// Enforces typed delete confirmation for requests originating from the
// system-admin frontend. Every DELETE request that carries the
// `x-client-app: system-admin` header must include `confirmText: "DELETE"`
// in the request body, matching the ConfirmDeleteModal UX on that client.
function deleteConfirmationMiddleware(req, res, next) {
  if (req.method !== "DELETE") return next();

  const clientApp = String(req.headers["x-client-app"] || "").trim().toLowerCase();
  if (clientApp !== "system-admin") return next();

  const confirmText = String(req.body?.confirmText || "").trim().toUpperCase();
  if (confirmText !== "DELETE") {
    return res.status(400).json({
      success: false,
      message: 'Deletion requires confirmation. Type "DELETE" to confirm this action.',
    });
  }

  return next();
}

export { deleteConfirmationMiddleware };
