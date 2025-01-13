import { createServer } from './server';
import prisma from './config/db';
import { Request, Response, Express } from 'express';

let app: Express | null = null;

// Create and configure the server
const initializeServer = async () => {
  if (!app) {
    await prisma.$connect();
    app = await createServer();
  }
  return app;
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  initializeServer().then(server => {
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
  });
}

// For Vercel serverless
export default async function handler(req: Request, res: Response) {
  try {
    const server = await initializeServer();

    // Create a promise that resolves with the response
    return new Promise(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server(req, res, (err: any) => {
        if (err) {
          console.error('Error handling request:', err);
          res.status(500).json({ message: 'Internal Server Error' });
        }
        resolve(undefined);
      });
    });
  } catch (error) {
    console.error('Server initialization error:', error);
    res.status(500).json({ message: 'Server Initialization Error' });
    return Promise.resolve();
  }
}
