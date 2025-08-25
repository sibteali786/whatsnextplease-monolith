// api/index.ts
import { env } from './config/environment';
import { createServer } from './server';
import prisma from './config/db';
import { Express } from 'express';
import { logger } from './utils/logger';
import { TaskOverdueScheduler } from './schedulers/taskOverdueScheduler';

let app: Express | null = null;

const initializeServer = async () => {
  if (!app) {
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected successfully');
    app = await createServer();
  }
  return app;
};

// Start server
initializeServer()
  .then(server => {
    server.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT}`);
    });
    // Initialize task scheduler
    const taskScheduler = new TaskOverdueScheduler();
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Closing server...`);
      taskScheduler.stop();
      await prisma.$disconnect();
      logger.info('Database disconnected, Server Shutting down...');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch(error => {
    console.log(error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
