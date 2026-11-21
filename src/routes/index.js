const express = require('express');
const healthRoutes = require('../modules/health/health.route');
const authRoutes = require('../modules/auth/auth.route');
const adminRoutes = require('../modules/admin/admin.route');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/admin', adminRoutes);

module.exports = router;