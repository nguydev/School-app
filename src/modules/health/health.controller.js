const healthService = require('./health.service');

function live(_req, res) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

function ready(_req, res) {
  const database = healthService.getDatabaseStatus();
  const isReady = database === 'connected';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'unavailable',
    checks: { database },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  live,
  ready,
};