const authService = require('./auth.service');

function respond(res, status, message, data) {
  res.status(status).json({
    success: true,
    message,
    ...(data ? { data } : {}),
  });
}

async function registerStart(req, res) {
  const data = await authService.startRegistration(req, req.validated.body);
  respond(res, 202, 'If this address can be registered, a verification code will be sent', data);
}

async function verifyRegistrationOtp(req, res) {
  const data = await authService.verifyRegistrationOtp(req, req.validated.body);
  respond(res, 201, 'Registration completed successfully', data);
}

async function login(req, res) {
  const data = await authService.login(req, req.validated.body);
  respond(res, 200, 'Login successful', data);
}

async function refresh(req, res) {
  const data = await authService.refreshSession(req, req.validated.body.refresh_token);
  respond(res, 200, 'Tokens refreshed successfully', data);
}

async function logout(req, res) {
  await authService.logout(req, req.validated.body.refresh_token);
  respond(res, 200, 'Logged out successfully');
}

async function forgotPassword(req, res) {
  const data = await authService.requestPasswordReset(req, req.validated.body.email);
  respond(res, 202, 'If the account exists, password reset instructions will be sent', data);
}

async function resetPassword(req, res) {
  const data = await authService.resetPassword(req, req.validated.body);
  respond(res, 200, 'Password reset successfully', { user: data });
}

async function resendOtp(req, res) {
  const data = await authService.resendOtp(req, req.validated.body);
  respond(res, 202, 'If the request is eligible, a new code will be sent', data);
}

function me(req, res) {
  respond(res, 200, 'Current user', { user: authService.publicUser(req.user) });
}

module.exports = {
  registerStart,
  verifyRegistrationOtp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  resendOtp,
  me,
};
