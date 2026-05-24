import Joi from "joi";
import { SYSTEM_ROLES } from "../config/roles.js";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

export const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().required(),
  phoneNumber: Joi.string().trim().min(6).max(32).required(),
  password: Joi.string().min(8).max(128).required(),
  churchId: objectId.optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().optional()
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(10).required()
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().trim().email().required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(10).required(),
  newPassword: Joi.string().min(8).max(128).required()
});

export const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(1).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().min(8).max(128).required()
});

export const adminLoginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(1).max(128).required()
});

export const adminRegisterSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().required(),
  phoneNumber: Joi.string().trim().min(6).max(32).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string()
    .trim()
    .valid(...SYSTEM_ROLES)
    .required()
});
