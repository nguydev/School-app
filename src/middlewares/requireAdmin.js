const ApiError = require('../utils/ApiError');

function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Administrator access is required', 'ADMIN_ACCESS_REQUIRED'));
  }

  return next();
}

module.exports = requireAdmin;
