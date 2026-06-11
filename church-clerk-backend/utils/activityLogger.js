import ActivityLog from "../models/activityLogModel.js";
import { getClientIp, parseUserAgentMeta } from "./requestHelpers.js";

async function logActivity({
  user,
  module,
  action,
  status,
  userName,
  userRole,
  church,
  ipAddress,
  browser,
  os,
  deviceType,
  model,
  httpMethod,
  path,
  description,
  responseStatusCode,
  userAgent,
  req
}) {
  try {
    const ip = ipAddress || (req ? getClientIp(req) : "");
    const ua = userAgent || (req ? String(req.headers["user-agent"] || "") : "");
    const meta = browser && os ? { browser, os, deviceType, model } : parseUserAgentMeta(ua);

    await ActivityLog.create({
      user,
      module,
      action,
      status,
      userName,
      userRole,
      church,
      ipAddress: ip,
      browser: meta.browser,
      os: meta.os,
      deviceType: meta.deviceType,
      model: meta.model,
      httpMethod: httpMethod || (req ? String(req.method || "") : ""),
      path: path || (req ? String(req.originalUrl || "") : ""),
      description,
      responseStatusCode,
      userAgent: ua
    });
  } catch (error) {
    // Silently fail to avoid breaking main flow
    console.error("[activityLogger] Failed to log activity:", error);
  }
}

export { logActivity };
