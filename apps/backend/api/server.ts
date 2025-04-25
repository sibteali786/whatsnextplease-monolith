import express from 'express';
import cors from 'cors';
import { notificationRoutes } from './routes/notification.routes';
import { errorMiddleware } from './middleware/error/error.middleware';
import { userRoutes } from './routes/user.routes';
import { clientRoutes } from './routes/client.routes';
import { skillCategoryRoutes } from './routes/skillCategory.routes';
import { taskCategoryRoutes } from './routes/taskCategory.routes';
import { skillRoutes } from './routes/skill.routes';
import { taskAgentRoutes } from './routes/taskAgent.routes';
import { entityRoutes } from './routes/entity.routes';

export async function createServer() {
  const app = express();

  // middlewares
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/notifications', notificationRoutes);
  app.use('/user', userRoutes);
  app.use('/client', clientRoutes);
  app.use('/skill', skillRoutes);
  app.use('/entity', entityRoutes);
  app.use('/skillCategory', skillCategoryRoutes);
  app.use('/taskCategory', taskCategoryRoutes);
  app.use('/taskAgents', taskAgentRoutes);
  // Health check route
  app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  app.get('/', (req, res) => {
    res
      .status(200)
      .json({ status: 'healthy', message: 'Welcome to the WNP API', uptime: process.uptime() });
  });
  // Handle 404
  app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  // error Middleware
  app.use(errorMiddleware);

  return app;
}
