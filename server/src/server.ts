import app from './app';
import { env } from './config/environment';
import { closePool } from './config/database';
import { logger } from './utils';

const PORT = env.port;

const server = app.listen(PORT, () => {
  logger.info(`College ERP API Server started`);
  logger.info(`Environment: ${env.nodeEnv}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

// ─── Graceful Shutdown ───────────────────────────────────
function shutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    await closePool();
    logger.info('Database pool closed');

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  shutdown('uncaughtException');
});
