const express = require('express');
const healthRoutes = require('../modules/health/health.route');
const authRoutes = require('../modules/auth/auth.route');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/api/v1/auth', authRoutes);

module.exports = router;