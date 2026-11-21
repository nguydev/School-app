const nodemailer = require('nodemailer');
const env = require('./env');
const ApiError = require('../utils/ApiError');
const logger = require('./logger');

const transport = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user
        ? { user: env.smtp.user, pass: env.smtp.password }
        : undefined,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

function assertConfigured() {
  if (!transport) {
    throw new ApiError(
      503,
      'Email delivery is not configured',
      'EMAIL_SERVICE_UNAVAILABLE',
    );
  }
}

async function sendOtp(email, code, purpose) {
  assertConfigured();

  const isRegistration = purpose === 'registration';
  const subject = isRegistration ? 'Verify your email address' : 'Reset your password';
  const action = isRegistration ? 'verify your email address' : 'reset your password';

  try {
    await transport.sendMail({
      from: env.smtp.from,
      to: email,
      subject,
      text: `Use this code to ${action}: ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      html: `<p>Use this code to ${action}:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
    });
    if (env.logOtpToConsole) {
      logger.info({ purpose, otp: code }, 'Development-only OTP');
    }
  } catch (error) {
    logger.error(
      { errorName: error.name, code: error.code },
      'OTP email delivery failed',
    );
    throw new ApiError(
      503,
      'Email delivery is temporarily unavailable',
      'EMAIL_DELIVERY_FAILED',
    );
  }
}

function close() {
  transport?.close();
}

module.exports = {
  assertConfigured,
  sendOtp,
  close,
};
