const authService = require('../auth/auth.service');

function me(req, res) {
  res.status(200).json({
    success: true,
    message: 'Administrator account',
    data: { user: authService.publicUser(req.user) },
  });
}

module.exports = { me };
