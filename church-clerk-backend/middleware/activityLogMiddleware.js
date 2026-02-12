import ActivityLog from "../models/activityLogModel.js";

function parseUserAgentMeta(uaRaw) {
  const ua = String(uaRaw || "");
  const lower = ua.toLowerCase();

  let os = "";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) os = "iOS";
  else if (lower.includes("mac os x") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  let browser = "";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/") && !lower.includes("chromium")) browser = "Safari";

  const isTablet = /ipad|tablet/i.test(ua);
  const isMobile = !isTablet && /mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua);
  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let model = "";
  const androidModel = ua.match(/Android\s[\d.]+;\s([^;\)]+?)\sBuild/i);
  if (androidModel?.[1]) model = String(androidModel[1]).trim();
  else if (/iPhone/i.test(ua)) model = "iPhone";
  else if (/iPad/i.test(ua)) model = "iPad";
  else if (/Macintosh/i.test(ua)) model = "Mac";
  else if (/Windows/i.test(ua)) model = "Windows PC";

  return {
    browser,
    os,
    deviceType,
    model
  };
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }

  const xr = req.headers["x-real-ip"];
  if (typeof xr === "string" && xr.trim()) {
    return xr.trim();
  }

  const raw = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "";
  if (raw === "::1") return "127.0.0.1";
  return raw;
}

function inferModule(req) {
  const url = String(req.originalUrl || "");

  const mappings = [
    ["/api/v1/member", "Members"],
    ["/api/v1/attendance", "Attendance"],
    ["/api/v1/event", "Events"],
    ["/api/v1/announcement", "Announcements"],
    ["/api/v1/tithe", "Tithe"],
    ["/api/v1/income", "Income"],
    ["/api/v1/expense", "Expense"],
    ["/api/v1/general-expenses", "GeneralExpenses"],
    ["/api/v1/special-fund", "SpecialFunds"],
    ["/api/v1/offering", "Offerings"],
    ["/api/v1/financial-statement", "FinancialStatement"],
    ["/api/v1/church-project", "ChurchProjects"],
    ["/api/v1/welfare", "Welfare"],
    ["/api/v1/pledge", "Pledges"],
    ["/api/v1/business-ventures", "BusinessVentures"],
    ["/api/v1/reports-analytics", "ReportsAnalytics"],
    ["/api/v1/referral", "Referrals"],
    ["/api/v1/church", "Church"],
    ["/api/v1/user", "Settings"],
    ["/api/v1/auth", "Authentication"],
    ["/api/v1/system-admin", "SystemAdmin"],
    ["/api/v1/dashboard", "Dashboard"],
    ["/api/admin/billing", "Billing"],
    ["/api/v1/subscription", "Billing"]
  ];

  for (const [prefix, label] of mappings) {
    if (url.startsWith(prefix)) return label;
  }

  return "System";
}

function inferAction(req) {
  const url = String(req.originalUrl || "");
  const method = String(req.method || "").toUpperCase();

  if (url.includes("/api/v1/auth/login")) return "Login";
  if (url.includes("/api/v1/auth/register")) return "Register";
  if (url.includes("/api/v1/auth/logout")) return "Logout";

  if (url.includes("/password")) return "ChangePassword";

  if (url.includes("/status") && method === "PATCH") {
    if (typeof req.body?.isActive === "boolean") {
      return req.body.isActive ? "Activate" : "Deactivate";
    }
    return "UpdateStatus";
  }

  if (url.toLowerCase().includes("/convert")) return "Convert";
  if (url.toLowerCase().includes("/approve")) return "Approve";
  if (url.toLowerCase().includes("/reject")) return "Reject";

  if (method === "POST") return "Create";
  if (method === "PUT" || method === "PATCH") return "Update";
  if (method === "DELETE") return "Delete";

  return method;
}

function inferResource(req) {
  const params = req.params || {};
  return (
    params.id ||
    params._id ||
    params.eventId ||
    params.memberId ||
    params.fileId ||
    params.churchId ||
    ""
  );
}

function shouldSkip(req) {
  const url = String(req.originalUrl || "");
  if (url.startsWith("/api/v1/activity-log")) return true;
  return false;
}

export function activityLogMiddleware(req, res, next) {
  try {
    if (shouldSkip(req)) return next();

    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(String(req.method || "").toUpperCase());
    if (!isWrite) return next();

    const startedAt = Date.now();

    res.on("finish", () => {
      try {
        const user = req.user;
        if (!user?._id) return;

        const module = inferModule(req);
        const action = inferAction(req);
        const ipAddress = getClientIp(req);
        const userAgent = String(req.headers["user-agent"] || "");
        const meta = parseUserAgentMeta(userAgent);
        const statusCode = Number(res.statusCode || 0);
        const status = statusCode >= 400 ? "Failed" : "Success";

        const churchId = req.activeChurch?._id || user?.church || null;

        const doc = {
          user: user._id,
          userName: user.fullName || "",
          userRole: user.role || "",
          church: churchId || undefined,
          module,
          action,
          resource: inferResource(req),
          httpMethod: String(req.method || ""),
          path: String(req.originalUrl || ""),
          ipAddress,
          browser: meta.browser,
          os: meta.os,
          deviceType: meta.deviceType,
          model: meta.model,
          userAgent,
          responseStatusCode: statusCode,
          status,
          description: `Request completed in ${Date.now() - startedAt}ms`
        };

        void ActivityLog.create(doc);
      } catch (err) {
        console.error("ActivityLog middleware error:", err?.message || err);
      }
    });

    next();
  } catch (err) {
    next();
  }
}
