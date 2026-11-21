const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.logLevel,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
    censor: '[REDACTED]',
  },
  base: {
    service: 'yesin-backend',
    environment: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;