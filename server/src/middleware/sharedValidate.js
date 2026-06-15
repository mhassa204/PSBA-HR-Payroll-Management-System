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

      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: effectiveErrors,
      });
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { validateBody };
