import { createServer } from './server';
import prisma from './config/db';
import { Express } from 'express';
import { config } from 'dotenv';
config();
let app: Express | null = null;

// Create and configure the server
const initializeServer = async () => {
  if (!app) {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected successfully');

    app = await createServer();
  }
  return app;
};

const PORT = process.env.PORT || 3000;

// Start server
initializeServer()
  .then(server => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Closing server...`);
      await prisma.$disconnect();
      console.log('Database disconnected, Server Shutting down...');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
