const env = require('../config/env');
const logger = require('../config/logger');

function errorHandler(error, req, res, _next) {
  const parserError = error.type === 'entity.parse.failed';
  const oversizedBody = error.type === 'entity.too.large';
  const multerError = error.name === 'MulterError';
  const oversizedUpload = multerError && error.code === 'LIMIT_FILE_SIZE';
  const duplicateKeyError = error.code === 11000;
  const validationError = error.name === 'ValidationError';
  const providedStatus = error.statusCode || error.status;
  const statusCode =
    parserError || validationError
      ? 400
      : oversizedBody || oversizedUpload
        ? 413
        : multerError
          ? 400
          : duplicateKeyError
            ? 409
            : Number.isInteger(providedStatus) && providedStatus >= 400 && providedStatus < 600
              ? providedStatus
              : 500;
  let code = typeof error.code === 'string' ? error.code : 'REQUEST_FAILED';
  if (parserError) code = 'INVALID_JSON';
  else if (oversizedBody) code = 'PAYLOAD_TOO_LARGE';
  else if (oversizedUpload) code = 'UPLOAD_TOO_LARGE';
  else if (multerError) code = 'INVALID_MULTIPART_UPLOAD';
  else if (duplicateKeyError) code = 'CONFLICT';
  else if (validationError) code = 'VALIDATION_ERROR';
  else if (statusCode === 500) code = 'INTERNAL_SERVER_ERROR';

  let message = error.message || 'Internal server error';
  if (statusCode === 500 && env.isProduction) message = 'Internal server error';
  else if (parserError) message = 'Request body contains invalid JSON';
  else if (oversizedBody || oversizedUpload) message = 'Request body is too large';
  else if (multerError) message = 'Invalid image upload';
  else if (duplicateKeyError) message = 'A record with the provided details already exists';
  else if (validationError) message = 'Request validation failed';

  const logData = {
    requestId: req.id,
    statusCode,
    code,
    errorName: error.name,
  };
  if (!env.isProduction && statusCode === 500) {
    logData.stack = error.stack;
  }
  logger[statusCode >= 500 ? 'error' : 'warn'](logData, 'Request failed');

  const response = {
    success: false,
    error: { code, message },
    request_id: req.id,
  };

  if (!env.isProduction && error.details) {
    response.error.details = error.details;
  }
  if (!env.isProduction && statusCode === 500) {
    response.error.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;