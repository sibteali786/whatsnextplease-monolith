import express from 'express';
import cors from 'cors';
import { notificationRoutes } from './routes/notification.routes';

export async function createServer() {
  const app = express();

  // middlewares
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/notifications', notificationRoutes);

  // Health check route
  app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
  });
  // Handle 404
  app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });
  return app;
}
