const { createHmac } = require('node:crypto');
const env = require('../../config/env');
const AuthAudit = require('./auth-audit.model');

async function writeAuthAudit(req, action, success, userId) {
  const ipHash = req.ip
    ? createHmac('sha256', env.otpPepper).update(req.ip).digest('hex')
    : undefined;

  await AuthAudit.create({
    userId,
    action,
    ipHash,
    userAgent: req.get('user-agent')?.slice(0, 512),
    requestId: req.id,
    success,
  });
}

module.exports = writeAuthAudit;
