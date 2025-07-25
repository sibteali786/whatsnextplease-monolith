import { Response, Router } from 'express';
import { NotificationController } from '../controller/notification.controller';
import { AuthenticatedRequest, verifyToken, verifyTokenFromQuery } from '../middleware/auth';
import { Roles } from '@prisma/client';
import { pushNotificationService } from '../services/pushNotification.service';

const router = Router();
const controller = new NotificationController();

// SSE endpoint with query token verification
router.get('/subscribe/:userId', verifyTokenFromQuery, controller.subscribe);

// Other routes with regular token verification
router.post('/', verifyToken, controller.create);
router.get('/:userId', verifyToken, controller.getUserNotifications);
router.patch('/:id/read', verifyToken, controller.markAsRead);
router.patch('/:userId/readAll', verifyToken, controller.markAllAsRead);
// Add this route in your existing router
router.post('/push-subscription', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { subscription } = req.body;
  const userId = req.user?.role === Roles.CLIENT && req.user?.id ? null : (req.user?.id ?? null);
  const clientId = req.user?.role === Roles.CLIENT ? (req.user?.id ?? null) : null;
  try {
    await pushNotificationService.saveSubscription(userId, clientId, subscription);
    res.status(201).json({ message: 'Push subscription saved' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: 'Failed to save push subscription: ' + error.message });
    }
  }
});

router.delete(
  '/push-subscription',
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { endpoint } = req.body;
    if (typeof endpoint !== 'string' || endpoint.trim() === '') {
      res.status(400).json({ error: 'Invalid endpoint. It must be a non-empty string.' });
      return;
    }
    try {
      await pushNotificationService.deleteSubscription(endpoint);
      res.status(200).json({ message: 'Push subscription removed' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: 'Failed to remove push subscription: ' + error.message });
      }
    }
  }
);

export const notificationRoutes = router;
