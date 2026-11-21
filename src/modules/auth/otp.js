const { createHmac, randomInt, timingSafeEqual } = require('node:crypto');
const env = require('../../config/env');

function createOtp() {
  return String(randomInt(100000, 1000000));
}

function hashOtp(email, purpose, code) {
  return createHmac('sha256', env.otpPepper)
    .update(`${purpose}:${email}:${code}`)
    .digest('hex');
}

function matchesOtp(email, purpose, code, storedHash) {
  if (!/^[a-f0-9]{64}$/i.test(storedHash || '')) {
    return false;
  }

  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(hashOtp(email, purpose, code), 'hex');
  return timingSafeEqual(actual, expected);
}

module.exports = {
  createOtp,
  hashOtp,
  matchesOtp,
};
