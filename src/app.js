const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const pinoHttp = require('pino-http');
const env = require('./config/env');
const logger = require('./config/logger');
const requestId = require('./middlewares/requestId.middleware');
const { apiRateLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes');
const notFound = require('./middlewares/notFound.middleware');
const errorHandler = require('./middlewares/error.middleware');
const swaggerUi = require('swagger-ui-express');
const openApiSpec = require('./docs/openapi');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxyHops);
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: typeof req.url === 'string' ? req.url.split('?')[0] : '',
          headers: req.headers,
          remoteAddress: req.socket?.remoteAddress,
          remotePort: req.socket?.remotePort,
        };
      },
    },
  }),
);
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
  }),
);
app.get('/api-docs/openapi.json', (_req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
app.use(compression());
app.use('/api/v1', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
});
app.use('/api/v1', apiRateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;