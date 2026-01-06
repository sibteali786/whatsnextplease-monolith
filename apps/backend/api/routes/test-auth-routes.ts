import { Router } from 'express';
import { verifyTokenHybrid } from '../middleware/auth/hybrid-auth.middleware';
import { AuthenticatedRequest } from '../middleware/auth/types';
import { Response } from 'express';

const router = Router();

// Test endpoint to verify hybrid auth works
router.get('/me', verifyTokenHybrid, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    authMethod: req.user?.cognitoSub ? 'Cognito/Keycloak' : 'Legacy JWT',
  });
});

export { router as testAuthRoutes };
