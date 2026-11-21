const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(new ApiError(404, 'Route not found'));
}

module.exports = notFound;