const AFRICAN_COUNTRY_CURRENCY = {
  DZ: "DZD",
  AO: "AOA",
  BJ: "XOF",
  BW: "BWP",
  BF: "XOF",
  BI: "BIF",
  CV: "CVE",
  CM: "XAF",
  CF: "XAF",
  TD: "XAF",
  KM: "KMF",
  CD: "CDF",
  CG: "XAF",
  CI: "XOF",
  DJ: "DJF",
  EG: "EGP",
  GQ: "XAF",
  ER: "ERN",
  SZ: "SZL",
  ET: "ETB",
  GA: "XAF",
  GM: "GMD",
  GH: "GHS",
  GN: "GNF",
  GW: "XOF",
  KE: "KES",
  LS: "LSL",
  LR: "LRD",
  LY: "LYD",
  MG: "MGA",
  MW: "MWK",
  ML: "XOF",
  MR: "MRU",
  MU: "MUR",
  MA: "MAD",
  MZ: "MZN",
  NA: "NAD",
  NE: "XOF",
  NG: "NGN",
  RW: "RWF",
  ST: "STN",
  SN: "XOF",
  SC: "SCR",
  SL: "SLL",
  SO: "SOS",
  ZA: "ZAR",
  SS: "SSP",
  SD: "SDG",
  TZ: "TZS",
  TG: "XOF",
  TN: "TND",
  UG: "UGX",
  ZM: "ZMW",
  ZW: "USD"
};

export function resolveCurrencyFromCountryCode(countryCode) {
  const code = String(countryCode || "")
    .trim()
    .toUpperCase();
  if (!code) return { currency: "USD", isAfrica: false };

  const currency = AFRICAN_COUNTRY_CURRENCY[code];
  if (currency) return { currency, isAfrica: true };

  return { currency: "USD", isAfrica: false };
}

export function isAfricanCountryCode(countryCode) {
  const code = String(countryCode || "")
    .trim()
    .toUpperCase();
  return Boolean(code && AFRICAN_COUNTRY_CURRENCY[code]);
}
