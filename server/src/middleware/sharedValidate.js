/**
 * Backend enforcement of the SINGLE-SOURCE validation rules in /shared/validation.
 * Use as route middleware:  router.post('/', validateBody('employment'), controller)
 *
 * Because multipart/form-data (file uploads) is parsed by multer, this runs AFTER
 * the upload middleware so req.body is populated. On failure it responds 422 with
 * a { success:false, errors:{field:message} } payload matching the frontend shape.
 */
const { validate } = require("../../../shared/validation");

function validateBody(schemaName, { partial = false } = {}) {
  return (req, res, next) => {
    try {
      const data = req.body || {};
      const { valid, errors } = validate(schemaName, data);

      // On partial updates (PUT/PATCH), only validate fields that were actually sent
      const effectiveErrors =
        partial && data
          ? Object.fromEntries(
              Object.entries(errors).filter(([field]) =>
                Object.prototype.hasOwnProperty.call(data, field)
              )
            )
          : errors;

      if (valid || Object.keys(effectiveErrors).length === 0) return next();

      // Log which fields failed (and their sent values) to aid debugging.
      console.warn(
        `⚠️ Validation failed [${schemaName}${partial ? " partial" : ""}]:`,
        Object.fromEntries(
          Object.keys(effectiveErrors).map((f) => [f, { value: data[f], error: effectiveErrors[f] }])
        )
      );

      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: effectiveErrors,
        // Also expose a single combined string so clients that only read `error` show it.
        error:
          "Validation failed: " +
          Object.entries(effectiveErrors)
            .map(([f, m]) => `${f}: ${m}`)
            .join("; "),
      });
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { validateBody };
