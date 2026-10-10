export const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();

  d.setMonth(d.getMonth() + months);

  if (d.getDate() < day) {
    d.setDate(0);
  }

  return d;
};

export const addDays = (date, days) => {
  const d = new Date(date);
  // Millisecond arithmetic — a "day" is exactly 24h. Using setDate() here is
  // DST-sensitive: across a clock-change the resulting interval can be 23h or
  // 25h per day, which makes countdowns (Math.ceil) show an extra day and
  // grants slightly more/less access than configured.
  d.setTime(d.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  return d;
};

export const addHours = (date, hours) => {
  const d = new Date(date);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
};

export const addWeeks = (date, weeks) => {
  const d = new Date(date);
  d.setTime(d.getTime() + Number(weeks) * 7 * 24 * 60 * 60 * 1000);
  return d;
};

export const addInterval = (date, billingInterval) => {
  const v = String(billingInterval || "monthly").trim().toLowerCase();
  if (v === "hourly")    return addHours(date, 1);
  if (v === "daily")     return addDays(date, 1);
  if (v === "weekly")    return addWeeks(date, 1);
  if (v === "monthly")   return addMonths(date, 1);
  if (v === "quarterly") return addMonths(date, 3);
  if (v === "halfyear" || v === "biannually") return addMonths(date, 6);
  if (v === "yearly"   || v === "annually")   return addMonths(date, 12);
  return addMonths(date, 1);
};