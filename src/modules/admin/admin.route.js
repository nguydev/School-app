const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middlewares/authenticate');
const requireAdmin = require('../../middlewares/requireAdmin');
const adminController = require('./admin.controller');
const academicRoutes = require('../academic/routes');
const mediaAssetRoutes = require('../media-assets/mediaAsset.route');

const router = express.Router();

router.use(authenticate, requireAdmin);
router.get('/me', asyncHandler(adminController.me));
router.use('/', academicRoutes);
router.use('/media-assets', mediaAssetRoutes);

module.exports = router;
