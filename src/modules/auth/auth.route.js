const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const {
  loginLimiter,
  otpEmailLimiter,
  otpIpLimiter,
  otpVerifyLimiter,
  refreshLimiter,
} = require('../../middlewares/rateLimiter');
const authController = require('./auth.controller');
const schemas = require('./auth.validation');

const router = express.Router();

router.post(
  '/register/step1',
  validate(schemas.registerStart),
  otpIpLimiter,
  otpEmailLimiter,
  asyncHandler(authController.registerStart),
);
router.post(
  '/register/verify-otp',
  validate(schemas.verifyRegistrationOtp),
  otpVerifyLimiter,
  asyncHandler(authController.verifyRegistrationOtp),
);
router.post(
  '/login',
  validate(schemas.login),
  loginLimiter,
  asyncHandler(authController.login),
);
router.post(
  '/refresh',
  validate(schemas.refresh),
  refreshLimiter,
  asyncHandler(authController.refresh),
);
router.post('/logout', validate(schemas.logout), asyncHandler(authController.logout));
router.post(
  '/password/forgot',
  validate(schemas.forgotPassword),
  otpIpLimiter,
  otpEmailLimiter,
  asyncHandler(authController.forgotPassword),
);
router.post(
  '/password/reset',
  validate(schemas.resetPassword),
  otpVerifyLimiter,
  asyncHandler(authController.resetPassword),
);
router.post(
  '/resend-otp',
  validate(schemas.resendOtp),
  otpIpLimiter,
  otpEmailLimiter,
  asyncHandler(authController.resendOtp),
);
router.get('/me', authenticate, asyncHandler(authController.me));

module.exports = router;
