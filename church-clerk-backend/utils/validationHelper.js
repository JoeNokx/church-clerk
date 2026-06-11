function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter((field) => !data[field]);
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(", ")}` };
  }
  return { valid: true };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) {
    return { valid: false, message: "Email is required" };
  }
  if (!emailRegex.test(normalized)) {
    return { valid: false, message: "Invalid email format" };
  }
  return { valid: true, value: normalized };
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters" };
  }
  return { valid: true };
}

function validateMatch(value1, value2, fieldName) {
  if (value1 !== value2) {
    return { valid: false, message: `${fieldName} do not match` };
  }
  return { valid: true };
}

export { validateRequiredFields, validateEmail, validatePassword, validateMatch };
