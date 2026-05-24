import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

export const createTitheIndividualSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().trim().min(1).max(50).required(),
  date: Joi.string().isoDate().required(),

  memberId: objectId.allow("", null).optional(),
  memberIds: Joi.array().items(objectId).max(200).optional(),
  searchMember: Joi.string().trim().max(200).allow("", null).optional()
});

export const createTitheAggregateSchema = Joi.object({
  date: Joi.string().isoDate().required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().trim().min(1).max(500).required()
});

export const createOfferingSchema = Joi.object({
  serviceType: Joi.string().trim().min(1).max(100).required(),
  offeringType: Joi.string().trim().min(1).max(100).required(),
  serviceDate: Joi.string().isoDate().required(),
  amount: Joi.number().positive().required()
});

export const createSpecialFundSchema = Joi.object({
  giverName: Joi.string().trim().min(1).max(200).required(),
  category: Joi.string().trim().min(1).max(120).required(),
  totalAmount: Joi.number().positive().required(),
  givingDate: Joi.string().isoDate().required(),
  description: Joi.string().trim().max(1000).allow("", null).optional()
});

export const createWelfareContributionSchema = Joi.object({
  amount: Joi.number().positive().required(),
  date: Joi.string().isoDate().required(),
  paymentMethod: Joi.string().trim().max(50).allow("", null).optional(),

  memberId: objectId.allow("", null).optional(),
  searchMember: Joi.string().trim().max(200).allow("", null).optional()
});

export const createWelfareDisbursementSchema = Joi.object({
  beneficiaryName: Joi.string().trim().min(1).max(200).required(),
  category: Joi.string().trim().min(1).max(120).required(),
  amount: Joi.number().positive().required(),
  date: Joi.string().isoDate().required(),
  description: Joi.string().trim().max(1000).allow("", null).optional(),
  paymentMethod: Joi.string().trim().max(50).allow("", null).optional()
});
