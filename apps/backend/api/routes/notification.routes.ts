import { Router } from 'express';
import { NotificationController } from '../controller/notificaton.controller';

const router = Router();
const controller = new NotificationController();

router.get('/subscribe/:userId', controller.subscribe);
router.post('/', controller.create);
router.get('/:userId', controller.getUserNotifications);
router.patch('/:id/read', controller.markAsRead);

export const notificationRoutes = router;
