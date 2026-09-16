import Joi from "joi";

/**
 * Validates a data object against a Joi schema.
 * Returns { fieldName: "error message" } for each invalid field.
 * Returns {} when everything is valid.
 */
export function validateForm(schema, data) {
  const { error } = schema.validate(data, {
    abortEarly: false,
    errors: { label: "key" }
  });
  if (!error) return {};

  const errors = {};
  for (const detail of error.details) {
    const field = detail.path[0];
    if (field && !errors[field]) {
      errors[field] = detail.message.replace(/['"]/g, "");
    }
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
