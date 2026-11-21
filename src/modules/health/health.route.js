const express = require('express');
const healthController = require('./health.controller');

const router = express.Router();

router.get('/live', healthController.live);
router.get('/ready', healthController.ready);

module.exports = router;