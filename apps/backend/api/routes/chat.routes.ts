import { Router } from 'express';
import { ChatController } from '../controller/chat.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Register tenant (admin only)
router.post('/register-tenant', verifyToken, ChatController.registerTenant);

// Generate token for authenticated user
router.get('/init-token', verifyToken, ChatController.generateInitToken);

export const chatRoutes = router;
