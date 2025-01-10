import { createServer } from './server';
import prisma from './config/db';

const startServer = async () => {
  try {
    await prisma.$connect();
    const app = await createServer();
    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Closing server...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected, Server Shutting down...');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
