import { Router } from 'express';
import { NotificationController } from '../controller/notification.controller';
import { verifyToken, verifyTokenFromQuery } from '../middleware/auth';

const router = Router();
const controller = new NotificationController();

// SSE endpoint with query token verification
router.get('/subscribe/:userId', verifyTokenFromQuery, controller.subscribe);

// Other routes with regular token verification
router.post('/', verifyToken, controller.create);
router.get('/:userId', verifyToken, controller.getUserNotifications);
router.patch('/:id/read', verifyToken, controller.markAsRead);
router.patch('/:userId/readAll', verifyToken, controller.markAllAsRead);

export const notificationRoutes = router;
