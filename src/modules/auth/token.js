const { createHash, randomBytes, randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');

const accessTokenLifetimeSeconds = 15 * 60;

function createAccessToken(userId, sessionId) {
  return jwt.sign(
    { type: 'access', sid: sessionId },
    env.jwtAccessSecret,
    {
      algorithm: 'HS256',
      subject: userId.toString(),
      issuer: 'yesin-backend',
      audience: 'yesin-app',
      expiresIn: accessTokenLifetimeSeconds,
      jwtid: randomUUID(),
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, {
    algorithms: ['HS256'],
    issuer: 'yesin-backend',
    audience: 'yesin-app',
  });
}

function createRefreshToken() {
  return randomBytes(48).toString('base64url');
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

module.exports = {
  accessTokenLifetimeSeconds,
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashToken,
};
