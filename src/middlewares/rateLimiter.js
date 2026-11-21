const { createHmac } = require('node:crypto');
const { ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');
const AuthRateLimit = require('../modules/auth/auth-rate-limit.model');
const ApiError = require('../utils/ApiError');

function createRateLimiter({ name, windowMs, limit, keyForRequest }) {
  return async function rateLimitRequest(req, res, next) {
    try {
      const now = Date.now();
      const windowStartMs = Math.floor(now / windowMs) * windowMs;
      const windowStart = new Date(windowStartMs);
      const sourceKey = keyForRequest(req);
      const key = createHmac('sha256', env.otpPepper)
        .update(`${name}:${sourceKey}`)
        .digest('hex');
      const filter = { key, windowStart };
      const update = {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowStartMs + windowMs * 2) },
      };

      let bucket;
      try {
        bucket = await AuthRateLimit.findOneAndUpdate(filter, update, {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }).lean();
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        bucket = await AuthRateLimit.findOneAndUpdate(filter, { $inc: { count: 1 } }, {
          new: true,
        }).lean();
      }

      if (bucket.count > limit) {
        const retryAfter = Math.max(1, Math.ceil((windowStartMs + windowMs - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        throw new ApiError(429, 'Too many requests. Please try again later.', 'RATE_LIMITED');
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function clientIp(req) {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || '127.0.0.1');
}

function emailKey(req) {
  const email = req.validated?.body?.email;
  return typeof email === 'string' ? email.toLowerCase() : clientIp(req);
}

const apiRateLimiter = createRateLimiter({
  name: 'api',
  windowMs: 60 * 1000,
  limit: 100,
  keyForRequest: clientIp,
});

const loginLimiter = createRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyForRequest: clientIp,
});

const otpIpLimiter = createRateLimiter({
  name: 'otp-ip',
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyForRequest: clientIp,
});

const otpEmailLimiter = createRateLimiter({
  name: 'otp-email',
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyForRequest: emailKey,
});

const otpVerifyLimiter = createRateLimiter({
  name: 'otp-verify',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyForRequest: clientIp,
});

const refreshLimiter = createRateLimiter({
  name: 'refresh',
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyForRequest: clientIp,
});

module.exports = {
  apiRateLimiter,
  loginLimiter,
  otpIpLimiter,
  otpEmailLimiter,
  otpVerifyLimiter,
  refreshLimiter,
};
