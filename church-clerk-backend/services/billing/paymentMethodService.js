import { toGhanaNationalFromE164, validatePhoneNumber } from "../../utils/validatePhoneNumber.js";

const luhnCheck = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (Number.isNaN(d)) return false;
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const detectCardBrand = (digits) => {
  const v = String(digits || "");
  if (/^4/.test(v)) return "Visa";
  if (/^(5[1-5])/.test(v)) return "Mastercard";
  if (/^(2[2-7])/.test(v)) return "Mastercard";
  return "Visa/Mastercard";
};

function validateMobileMoneyProvider(provider, phone) {
  const normalizedProvider = String(provider).toLowerCase();
  
  let phoneE164;
  try {
    phoneE164 = validatePhoneNumber(phone, "GH");
  } catch (e) {
    throw new Error(e?.message || "Invalid phone number");
  }

  let nationalPhone;
  try {
    nationalPhone = toGhanaNationalFromE164(phoneE164);
  } catch (e) {
    throw new Error(e?.message || "Invalid phone number");
  }

  if (!["mtn", "vod", "tgo"].includes(normalizedProvider)) {
    throw new Error("Unsupported mobile money provider");
  }

  const prefix = String(nationalPhone || "").slice(0, 3);
  const prefixByProvider = {
    mtn: ["024", "054", "055", "059"],
    vod: ["020", "050"],
    tgo: ["026", "027", "056", "057"]
  };
  const allowedPrefixes = prefixByProvider[normalizedProvider] || [];
  if (allowedPrefixes.length > 0 && !allowedPrefixes.includes(prefix)) {
    throw new Error("Mobile number does not match selected provider");
  }

  return { normalizedProvider, phoneE164, nationalPhone };
}

function validateCardDetails(cardNumber, expMonth, expYear, cvv, holderName) {
  const digits = String(cardNumber || "").replace(/\D+/g, "");
  if (!digits || digits.length < 13 || digits.length > 19) {
    throw new Error("Card number is invalid");
  }
  if (!luhnCheck(digits)) {
    throw new Error("Card number is invalid");
  }

  const m = Number(expMonth);
  const y = Number(expYear);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error("Expiry month is invalid");
  }
  if (!Number.isInteger(y) || y < 2000) {
    throw new Error("Expiry year is invalid");
  }

  const now = new Date();
  const expiryDate = new Date(y, m, 0, 23, 59, 59, 999);
  if (expiryDate.getTime() < now.getTime()) {
    throw new Error("Card is expired");
  }

  const cvvDigits = String(cvv || "").replace(/\D+/g, "");
  if (!cvvDigits || (cvvDigits.length !== 3 && cvvDigits.length !== 4)) {
    throw new Error("CVV is invalid");
  }

  const name = String(holderName || "").trim();
  if (!name) {
    throw new Error("Cardholder name is required");
  }

  return { digits, m, y, cvvDigits, name };
}

export { luhnCheck, detectCardBrand, validateMobileMoneyProvider, validateCardDetails };
