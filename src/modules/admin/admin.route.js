const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middlewares/authenticate');
const requireAdmin = require('../../middlewares/requireAdmin');
const adminController = require('./admin.controller');

const router = express.Router();

router.use(authenticate, requireAdmin);
router.get('/me', asyncHandler(adminController.me));

module.exports = router;
