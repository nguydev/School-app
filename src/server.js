const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const emailService = require('./config/email');
const env = require('./config/env');
const logger = require('./config/logger');
const { ensureAuthIndexes } = require('./modules/auth/auth.service');

let server;
let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  const timeout = setTimeout(() => {
    logger.fatal('Graceful shutdown timed out');
    process.exit(1);
  }, 10000);
  timeout.unref();

  try {
    if (server && server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections?.();
      });
    }
  } catch (error) {
    logger.error({ errorName: error.name, code: error.code }, 'HTTP server shutdown failed');
    exitCode = 1;
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    logger.error({ errorName: error.name, code: error.code }, 'MongoDB shutdown failed');
    exitCode = 1;
  }

  emailService.close();
  clearTimeout(timeout);
  process.exitCode = exitCode;
}

async function start() {
  await connectDatabase();
  await ensureAuthIndexes();
  server = app.listen(env.port);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  logger.info({ port: env.port }, 'HTTP server listening');
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.fatal({ errorName: error.name, code: error.code }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (error) => {
  logger.fatal(
    { errorName: error?.name, code: error?.code },
    'Unhandled promise rejection',
  );
  void shutdown('unhandledRejection', 1);
});

start().catch(async (error) => {
  logger.fatal({ errorName: error.name, code: error.code }, 'Server startup failed');
  try {
    await disconnectDatabase();
  } catch (disconnectError) {
    logger.error(
      { errorName: disconnectError.name, code: disconnectError.code },
      'MongoDB cleanup after startup failure failed',
    );
  }
  process.exitCode = 1;
});