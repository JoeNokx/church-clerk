import { parsePhoneNumberFromString } from "libphonenumber-js";

const AFRICAN_COUNTRIES = new Set([
  "DZ",
  "AO",
  "BJ",
  "BW",
  "BF",
  "BI",
  "CV",
  "CM",
  "CF",
  "TD",
  "KM",
  "CG",
  "CD",
  "CI",
  "DJ",
  "EG",
  "GQ",
  "ER",
  "SZ",
  "ET",
  "GA",
  "GM",
  "GH",
  "GN",
  "GW",
  "KE",
  "LS",
  "LR",
  "LY",
  "MG",
  "MW",
  "ML",
  "MR",
  "MU",
  "MA",
  "MZ",
  "NA",
  "NE",
  "NG",
  "RW",
  "ST",
  "SN",
  "SC",
  "SL",
  "SO",
  "ZA",
  "SS",
  "SD",
  "TZ",
  "TG",
  "TN",
  "UG",
  "ZM",
  "ZW"
]);

export function validatePhoneNumber(phone, defaultCountry) {
  const raw = String(phone || "").trim();
  const country = defaultCountry ? String(defaultCountry || "").trim() : undefined;

  const number = raw.startsWith("+")
    ? parsePhoneNumberFromString(raw)
    : parsePhoneNumberFromString(raw, country);

  if (!number || !number.isValid()) {
    throw new Error("Invalid phone number");
  }

  const detectedCountry = String(number.country || "").trim();
  if (!detectedCountry || !AFRICAN_COUNTRIES.has(detectedCountry)) {
    throw new Error("Only African phone numbers are allowed");
  }

  return number.number;
}

export function toGhanaNationalFromE164(phoneE164) {
  const raw = String(phoneE164 || "").trim();
  const number = parsePhoneNumberFromString(raw);

  if (!number || !number.isValid()) {
    throw new Error("Invalid phone number");
  }

  const callingCode = String(number.countryCallingCode || "").trim();
  if (callingCode !== "233") {
    throw new Error("Mobile money is only available for Ghana phone numbers");
  }

  const national = `0${String(number.nationalNumber || "").trim()}`;
  return national;
}
