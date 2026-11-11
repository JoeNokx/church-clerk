import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

export const createCareCaseSchema = Joi.object({
  memberId: objectId.required(),
  title: Joi.string().trim().min(1).max(200).required(),
  category: Joi.string()
    .valid("illness", "hospitalization", "bereavement", "new-baby", "family-crisis", "financial-hardship", "spiritual-support", "counseling", "other")
    .optional(),
  priority: Joi.string().valid("low", "normal", "high", "urgent").optional(),
  status: Joi.string().valid("open", "in-progress", "resolved", "closed").optional(),
  source: Joi.string()
    .valid("self-reported", "leader-referral", "family-referral", "pastoral-observation", "other")
    .optional(),
  confidential: Joi.boolean().optional(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
  assignedTo: Joi.array().items(objectId).max(20).optional(),
  dateOpened: Joi.string().isoDate().allow("", null).optional(),
  nextFollowUpDate: Joi.string().isoDate().allow("", null).optional(),
  resolutionNotes: Joi.string().trim().max(2000).allow("", null).optional()
});

export const createCareVisitSchema = Joi.object({
  visitType: Joi.string()
    .valid("home-visit", "hospital-visit", "phone-call", "counseling-session", "prayer", "other")
    .optional(),
  visitDate: Joi.string().isoDate().required(),
  conductedBy: Joi.array().items(objectId).max(20).optional(),
  notes: Joi.string().trim().max(2000).allow("", null).optional(),
  outcome: Joi.string()
    .valid("improving", "stable", "needs-attention", "escalated", "resolved", "no-contact")
    .optional(),
  nextFollowUpDate: Joi.string().isoDate().allow("", null).optional()
});

export const createPrayerRequestSchema = Joi.object({
  memberId: objectId.allow("", null).optional(),
  requesterName: Joi.string().trim().max(200).allow("", null).optional(),
  request: Joi.string().trim().min(1).max(2000).required(),
  category: Joi.string()
    .valid("health", "family", "finances", "guidance", "thanksgiving", "bereavement", "other")
    .optional(),
  status: Joi.string().valid("active", "answered", "archived").optional(),
  isPrivate: Joi.boolean().optional(),
  answerNote: Joi.string().trim().max(2000).allow("", null).optional()
});
