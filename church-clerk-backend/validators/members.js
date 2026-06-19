import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const dateISO = Joi.string().isoDate();

export const getMembersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  search: Joi.string().allow("").max(200).optional(),
  fastSearch: Joi.string().valid("0", "1").optional(),
  status: Joi.string().valid("all", "active", "inactive", "visitor", "former").optional(),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const createMemberSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  phoneNumber: Joi.string().trim().min(6).max(32).required(),
  email: Joi.string().trim().email().allow("", null).optional(),

  visitorId: objectId.allow(null, "").optional(),

  gender: Joi.string().valid("male", "female").allow("", null).optional(),
  occupation: Joi.string().trim().max(120).allow("", null).optional(),
  nationality: Joi.string().trim().max(80).allow("", null).optional(),
  status: Joi.string().valid("active", "inactive", "visitor", "former").allow("", null).optional(),
  note: Joi.string().trim().max(2000).allow("", null).optional(),

  dateOfBirth: dateISO.allow("", null).optional(),
  churchRole: Joi.string().trim().max(120).allow("", null).optional(),
  dateJoined: dateISO.allow("", null).optional(),

  streetAddress: Joi.string().trim().max(200).allow("", null).optional(),
  city: Joi.string().trim().max(120).allow("", null).optional(),
  region: Joi.string().trim().max(120).allow("", null).optional(),
  country: Joi.string().trim().max(120).allow("", null).optional(),
  maritalStatus: Joi.string().valid("single", "married", "divorced", "widowed", "other").allow("", null).optional(),

  department: Joi.array().items(objectId).max(50).optional(),
  cell: Joi.array().items(objectId).max(10).optional(),
  group: Joi.array().items(objectId).max(50).optional()
});

export const updateMemberSchema = createMemberSchema.fork(
  ["firstName", "lastName", "phoneNumber"],
  (schema) => schema.optional()
);
