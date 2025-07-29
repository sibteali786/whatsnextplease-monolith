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
import { fileRoutes } from './routes/file.routes';
import { env } from './config/environment';

export async function createServer() {
  const app = express();

  // middlewares
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-Requested-With',
      ],
      exposedHeaders: [
        'Cache-Control',
        'Content-Language',
        'Content-Type',
        'Expires',
        'Last-Modified',
        'Pragma',
      ],
    })
  );
  app.use(express.json());
  app.use('/notifications/subscribe', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Requested-With'
    );
    next();
  });
  // Routes
  app.use('/notifications', notificationRoutes);
  app.use('/user', userRoutes);
  app.use('/client', clientRoutes);
  app.use('/skill', skillRoutes);
  app.use('/entity', entityRoutes);
  app.use('/skillCategory', skillCategoryRoutes);
  app.use('/taskCategory', taskCategoryRoutes);
  app.use('/taskAgents', taskAgentRoutes);
  app.use('/files', fileRoutes);
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
