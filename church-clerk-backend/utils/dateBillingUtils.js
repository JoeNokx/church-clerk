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
  d.setDate(d.getDate() + days);
  return d;
};