const { promisify } = require('node:util');
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');

const scrypt = promisify(scryptCallback);
const workFactor = 32768;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;

async function deriveKey(password, salt) {
  return scrypt(password, salt, keyLength, {
    N: workFactor,
    r: blockSize,
    p: parallelization,
    maxmem: 64 * 1024 * 1024,
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  return [
    'scrypt',
    workFactor,
    blockSize,
    parallelization,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

async function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== 'string') {
    return false;
  }

  const [algorithm, n, r, p, saltValue, keyValue, extra] = encodedHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    Number(n) !== workFactor ||
    Number(r) !== blockSize ||
    Number(p) !== parallelization ||
    !saltValue ||
    !keyValue ||
    extra !== undefined
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const expectedKey = Buffer.from(keyValue, 'base64url');
  if (salt.length !== 16 || expectedKey.length !== keyLength) {
    return false;
  }

  const actualKey = await deriveKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
