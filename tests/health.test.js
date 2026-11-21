process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/yesin_app_test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-with-enough-length';
process.env.OTP_PEPPER = 'test-only-otp-pepper-with-enough-length';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('liveness endpoint reports that the process is running', async () => {
  const response = await fetch(`${baseUrl}/health/live`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.ok(response.headers.get('x-request-id'));
});

test('readiness endpoint reports an unavailable database before connection', async () => {
  const response = await fetch(`${baseUrl}/health/ready`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'unavailable');
  assert.equal(body.checks.database, 'disconnected');
});

test('unknown routes return a structured not-found response', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
});
