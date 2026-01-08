import { Router } from 'express';
import { migrationController } from '../controller/migration.controller';

const router = Router();

// POST /auth/migrate - Validate credentials and prepare for migration
router.post('/migrate', migrationController.migrateUser);

// POST /auth/link-cognito-sub - Link cognitoSub after Cognito user creation
router.post('/link-cognito-sub', migrationController.linkCognitoSub);

export { router as migrationRoutes };
