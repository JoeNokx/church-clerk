import https from "https";

const BILLING_INTERVALS = ["hourly", "daily", "weekly", "monthly", "quarterly", "halfYear", "yearly"];

const getPaystackSecretKey = () => {
  if (process.env.PAYSTACK_SECRET_KEY) return process.env.PAYSTACK_SECRET_KEY;
  if (String(process.env.PAYSTACK_MODE || "").toLowerCase() === "live") {
    return process.env.LIVE_SECRET_KEY || null;
  }
  return process.env.TEST_SECRET_KEY || null;
};

const toPaystackInterval = (billingInterval) => {
  const v = String(billingInterval || "").trim();
  if (v === "hourly")    return "hourly";
  if (v === "daily")     return "daily";
  if (v === "weekly")    return "weekly";
  if (v === "monthly")   return "monthly";
  if (v === "quarterly") return "quarterly";
  if (v === "halfYear")  return "biannually";
  if (v === "yearly")    return "annually";
  return null;
};

const paystackRequest = ({ path, method, body }) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      return reject(new Error("Paystack secret key is not configured"));
    }

    const req = https.request(
      {
        hostname: "api.paystack.co",
        path,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = data ? JSON.parse(data) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(json?.message || `Paystack request failed (${res.statusCode})`));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

const createOrUpdatePaystackPlansForInterval = async ({ planName, paystackPlanCodes, ghsPrices }) => {
  const codes = { ...(paystackPlanCodes || {}) };
  const errors = [];

  for (const interval of BILLING_INTERVALS) {
    const amount = ghsPrices?.[interval];
    if (amount === undefined || amount === null) continue;

    const paystackInterval = toPaystackInterval(interval);
    if (!paystackInterval) continue;

    const amountKobo = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo <= 0) continue;

    const existingCode = codes?.[interval];

    try {
      if (existingCode) {
        await paystackRequest({
          method: "PUT",
          path: `/plan/${encodeURIComponent(existingCode)}`,
          body: { amount: amountKobo, interval: paystackInterval }
        });
      } else {
        const result = await paystackRequest({
          method: "POST",
          path: "/plan",
          body: {
            name: `${planName} - ${interval}`,
            amount: amountKobo,
            interval: paystackInterval,
            currency: "GHS"
          }
        });
        const newCode = result?.data?.plan_code || null;
        if (newCode) codes[interval] = newCode;
      }
    } catch (e) {
      errors.push(`${interval}: ${e?.message || String(e)}`);
    }
  }

  return { codes, errors };
};

export { BILLING_INTERVALS, getPaystackSecretKey, toPaystackInterval, paystackRequest, createOrUpdatePaystackPlansForInterval };
