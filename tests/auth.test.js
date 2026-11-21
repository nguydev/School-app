process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/yesin_app_test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-with-enough-length';
process.env.OTP_PEPPER = 'test-only-otp-pepper-with-enough-length';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const env = require('../src/config/env');
const { matchesOtp, createOtp, hashOtp } = require('../src/modules/auth/otp');
const { hashPassword, verifyPassword } = require('../src/modules/auth/password');
const authenticate = require('../src/middlewares/authenticate');
const requireAdmin = require('../src/middlewares/requireAdmin');
const validate = require('../src/middlewares/validate');
const {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
} = require('../src/modules/auth/token');
const schemas = require('../src/modules/auth/auth.validation');

test('OTP console logging is disabled outside development', () => {
  assert.equal(env.logOtpToConsole, false);
});

test('password hashes are salted and verify only the matching password', async () => {
  const firstHash = await hashPassword('StrongPass123!');
  const secondHash = await hashPassword('StrongPass123!');

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword('StrongPass123!', firstHash), true);
  assert.equal(await verifyPassword('WrongPass123!', firstHash), false);
});

test('OTP hashes are bound to their email and purpose', () => {
  const code = createOtp();
  const hash = hashOtp('student@example.com', 'registration', code);

  assert.match(code, /^\d{6}$/);
  assert.equal(matchesOtp('student@example.com', 'registration', code, hash), true);
  assert.equal(matchesOtp('other@example.com', 'registration', code, hash), false);
  assert.equal(matchesOtp('student@example.com', 'password_reset', code, hash), false);
});

test('access tokens are signed and refresh tokens are high-entropy opaque values', () => {
  const userId = '507f1f77bcf86cd799439011';
  const sessionId = 'a4d16ed2-f78b-4ac7-a2d4-8a5a79501d76';
  const accessToken = createAccessToken(userId, sessionId);
  const claims = verifyAccessToken(accessToken);
  const refreshToken = createRefreshToken();

  assert.equal(claims.sub, userId);
  assert.equal(claims.sid, sessionId);
  assert.equal(claims.type, 'access');
  assert.match(refreshToken, /^[A-Za-z0-9_-]{64}$/);
  assert.notEqual(hashToken(refreshToken), refreshToken);
  assert.throws(() => verifyAccessToken(`${accessToken}x`));
});

test('registration start validates all account fields before sending the OTP', () => {
  const request = {
    body: {
      email: 'student@example.com',
      full_name: 'Student Name',
      school_name: 'Example School',
      subject: 'Computer Science',
      number: '+12345678901',
      password: 'StrongPass123!',
      'confirm-password': 'StrongPass123!',
      terms_accepted: true,
    },
    params: {},
    query: {},
  };

  assert.equal(schemas.registerStart.safeParse(request).success, true);
  assert.equal(
    schemas.registerStart.safeParse({
      ...request,
      body: { ...request.body, terms_accepted: false },
    }).success,
    false,
  );
  assert.equal(
    schemas.registerStart.safeParse({
      ...request,
      body: { ...request.body, password: 'weakpass', 'confirm-password': 'weakpass' },
    }).success,
    false,
  );
  assert.equal(
    schemas.registerStart.safeParse({
      ...request,
      body: { ...request.body, 'confirm-password': 'DifferentPass123!' },
    }).success,
    false,
  );
  assert.equal(
    schemas.registerStart.safeParse({
      ...request,
      body: { ...request.body, number: 'phone' },
    }).success,
    false,
  );
});

test('protected routes reject missing and invalid bearer tokens', async () => {
  async function authenticateHeader(header) {
    return new Promise((resolve) => {
      authenticate({ get: () => header }, {}, resolve);
    });
  }

  const missing = await authenticateHeader(undefined);
  const invalid = await authenticateHeader('Bearer not.a.valid.token');

  assert.equal(missing.statusCode, 401);
  assert.equal(missing.code, 'UNAUTHORIZED');
  assert.equal(invalid.statusCode, 401);
  assert.equal(invalid.code, 'INVALID_ACCESS_TOKEN');
});

test('administrator middleware allows only admin accounts', async () => {
  const checkRole = (role) => new Promise((resolve) => {
    requireAdmin({ user: { role } }, {}, resolve);
  });

  assert.equal(await checkRole('admin'), undefined);
  const denied = await checkRole('user');
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.code, 'ADMIN_ACCESS_REQUIRED');
});

test('validation errors do not retain submitted secret values', async () => {
  const error = await new Promise((resolve) => {
    validate(schemas.login)(
      {
        body: { email: 'not-an-email', password: 'NeverLogThisSecret1!' },
        params: {},
        query: {},
      },
      {},
      resolve,
    );
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(JSON.stringify(error.details).includes('NeverLogThisSecret1!'), false);
});
