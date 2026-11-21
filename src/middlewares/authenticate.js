const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const User = require('../modules/auth/user.model');
const RefreshToken = require('../modules/auth/refresh-token.model');
const { verifyAccessToken } = require('../modules/auth/token');

async function authenticate(req, _res, next) {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/i)
    : null;

  if (!match) {
    return next(new ApiError(401, 'Authentication is required', 'UNAUTHORIZED'));
  }

  let claims;
  try {
    claims = verifyAccessToken(match[1]);
  } catch {
    return next(new ApiError(401, 'Access token is invalid or expired', 'INVALID_ACCESS_TOKEN'));
  }

  if (
    claims.type !== 'access' ||
    typeof claims.sub !== 'string' ||
    !mongoose.isValidObjectId(claims.sub) ||
    typeof claims.sid !== 'string' ||
    !Number.isInteger(claims.iat)
  ) {
    return next(new ApiError(401, 'Access token is invalid or expired', 'INVALID_ACCESS_TOKEN'));
  }

  const now = new Date();
  const [user, session] = await Promise.all([
    User.findById(claims.sub),
    RefreshToken.exists({
      userId: claims.sub,
      sessionId: claims.sid,
      revokedAt: null,
      expiresAt: { $gt: now },
    }),
  ]);

  if (
    !user ||
    !user.isActive ||
    !user.isEmailVerified ||
    !session ||
    (user.passwordChangedAt &&
      claims.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
  ) {
    return next(new ApiError(401, 'Access token is invalid or expired', 'INVALID_ACCESS_TOKEN'));
  }

  req.user = user;
  req.auth = { sessionId: claims.sid };
  return next();
}

module.exports = authenticate;
