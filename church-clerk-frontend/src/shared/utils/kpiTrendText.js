// Interpretation line for KpiCard — plain period-over-period wording.
//
// Examples:
//   counts:  "3 more visitors than last month"
//   money:   "GH₵1,200 less than last month"   (pass format + fewerWord: "less")
//   rates:   "5 points higher than last year"  (pass format + higher/lower words)
export function kpiTrendText(diff, change, options = {}) {
  const {
    period = "last month",
    noun = null,
    format = null,
    moreWord = "more",
    fewerWord = "fewer",
  } = options;

  if (diff === undefined || diff === null) return "No comparison data available";
  if (diff === 0) return `No change from ${period}`;

  const n = Math.abs(diff);
  const amount = format ? format(n) : String(n);
  const nounText = noun ? ` ${n === 1 ? noun.one : noun.many ?? noun.one}` : "";
  return `${amount} ${diff > 0 ? moreWord : fewerWord}${nounText} than ${period}`;
}
