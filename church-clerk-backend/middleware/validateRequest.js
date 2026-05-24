import Joi from "joi";

export const validateRequest = (schema, property = "body") => {
  if (!schema || !Joi.isSchema(schema)) {
    throw new Error("A Joi schema is required");
  }

  return (req, res, next) => {
    const payload = req[property] ?? {};

    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const first = error.details?.[0]?.message || "Invalid request";
      return res.status(400).json({ message: first });
    }

    req.validated = req.validated || {};
    req.validated[property] = value;

    if (property === "query") {
      if (req.query && typeof req.query === "object") {
        Object.assign(req.query, value);
      } else {
        req.validatedQuery = value;
      }
    } else {
      req[property] = value;
    }
    return next();
  };
};
