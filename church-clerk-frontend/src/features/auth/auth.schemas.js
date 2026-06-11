import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Enter a valid email address",
      "any.required": "Email is required"
    }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required"
  }),
  rememberMe: Joi.boolean().optional()
});

export const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Name must be at least 2 characters",
    "any.required": "Full name is required"
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Enter a valid email address",
      "any.required": "Email is required"
    }),
  phoneNumber: Joi.string().min(6).max(32).required().messages({
    "string.empty": "Phone number is required",
    "any.required": "Phone number is required"
  }),
  password: Joi.string().min(8).max(128).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required"
  })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Enter a valid email address",
      "any.required": "Email is required"
    })
});

export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).max(128).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required"
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "string.empty": "Please confirm your password",
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your password"
    })
});
