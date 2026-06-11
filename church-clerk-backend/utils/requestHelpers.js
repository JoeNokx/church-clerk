function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "";
}

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

function normalizeEmail(value) {
  return String(value || "").toLowerCase().trim();
}

export { getClientIp, parseUserAgentMeta, normalizeEmail };
