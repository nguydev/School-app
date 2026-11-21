const ApiError = require('../utils/ApiError');

function validate(schema) {
  return function validateRequest(req, _res, next) {
    const result = schema.safeParse({
      body: req.body ?? {},
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: issue.message,
      }));
      return next(
        new ApiError(400, 'Request validation failed', 'VALIDATION_ERROR', details),
      );
    }

    req.validated = {
      ...req.validated,
      ...result.data,
      body: { ...req.validated?.body, ...result.data.body },
      params: { ...req.validated?.params, ...result.data.params },
      query: { ...req.validated?.query, ...result.data.query },
    };
    return next();
  };
}

module.exports = validate;