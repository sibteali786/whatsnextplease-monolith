import { Router } from 'express';
import { ChatController } from '../controller/chat.controller';
import { verifyTokenHybrid } from '../middleware/auth';

const router = Router();

// Register tenant (admin only)
router.post('/register-tenant', verifyTokenHybrid, ChatController.registerTenant);

// Generate token for authenticated user
router.get('/init-token', verifyTokenHybrid, ChatController.generateInitToken);

export const chatRoutes = router;
