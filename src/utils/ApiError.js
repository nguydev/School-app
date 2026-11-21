class ApiError extends Error {
  constructor(statusCode, message, codeOrDetails, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code =
      typeof codeOrDetails === 'string'
        ? codeOrDetails
        : statusCode === 400
          ? 'BAD_REQUEST'
          : statusCode === 401
            ? 'UNAUTHORIZED'
            : statusCode === 403
              ? 'FORBIDDEN'
              : statusCode === 404
                ? 'NOT_FOUND'
                : statusCode === 409
                  ? 'CONFLICT'
                  : statusCode === 413
                    ? 'PAYLOAD_TOO_LARGE'
                    : statusCode === 415
                      ? 'UNSUPPORTED_MEDIA_TYPE'
                      : statusCode === 429
                        ? 'RATE_LIMITED'
                        : statusCode === 503
                          ? 'SERVICE_UNAVAILABLE'
                          : 'INTERNAL_SERVER_ERROR';
    this.details = typeof codeOrDetails === 'string' ? details : codeOrDetails;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;