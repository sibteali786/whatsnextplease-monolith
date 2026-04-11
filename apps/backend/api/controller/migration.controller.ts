import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import prisma from '../config/db';
import { Roles, User, Client } from '@prisma/client';
import { logger } from '../utils/logger';
import { comparePwd } from '../utils/auth/hashPW';
import { getIdpAdminService } from '../services/idp/IdpAdminFactory';

const idpAdmin = getIdpAdminService();

export class MigrationController {
  /**
   * POST /auth/migrate
   * Migrates an existing user to IDP (Keycloak or Cognito)
   *
   * Body: { username, password }
   * Returns: { success, message, cognitoSub }
   */

  migrateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
      }
      // 1. Find user in database (User or Client)
      let entity: (User & { role: any }) | (Client & { role: any }) | null = null;
      let entityType: 'user' | 'client' | null = null;
      entity = await prisma.user.findUnique({
        where: { username },
        include: { role: true },
      });

      if (entity) {
        entityType = 'user';
      } else {
        entity = await prisma.client.findUnique({
          where: { username },
          include: { role: true },
        });
        if (entity) {
          entityType = 'client';
        }
      }

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      // 2. Check if already migrated
      if (entity.cognitoSub) {
        return res.status(400).json({
          success: false,
          message: 'User already migrated to IDP',
          cognitoSub: entity.cognitoSub,
        });
      }

      // 3. Verify password
      if (!entity.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'User has no password set',
        });
      }
      const isValidPassword = await comparePwd(password, entity.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
        });
      }
      // 4. Determine IDP group based on role
      const role = entityType === 'client' ? Roles.CLIENT : (entity.role?.name ?? Roles.TASK_AGENT);
      const idpGroups = [idpAdmin.mapRoleToGroup(role)];

      // 5. Create user in IDP (Keycloak or Cognito)
      const firstName =
        entityType === 'user' ? (entity as User).firstName : (entity as Client).contactName;
      const lastName = entityType === 'user' ? (entity as User).lastName : '';

      const createResult = await idpAdmin.createUser({
        username: entity.username,
        email: entity.email,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        password, // Use their existing password
        groups: idpGroups,
        role, // Pass the role to set appropriate attributes/groups in IDP
      });

      if (!createResult.success) {
        return res.status(500).json({
          success: false,
          message: `Failed to create IDP user: ${createResult.error}`,
        });
      }

      // 6. Save cognitoSub in database
      const updateData = {
        cognitoSub: createResult.sub,
      };

      if (entityType === 'user') {
        await prisma.user.update({
          where: { id: entity.id },
          data: updateData,
        });
      } else {
        await prisma.client.update({
          where: { id: entity.id },
          data: updateData,
        });
      }

      logger.info(`✅ Migrated ${entityType} ${username} to IDP with sub: ${createResult.sub}`);

      return res.status(200).json({
        success: true,
        message: 'User successfully migrated to IDP',
        cognitoSub: createResult.sub,
      });
    } catch (error) {
      logger.error('Migration error:', error);
      next(error);
    }
  });

  /**
   * POST /auth/link-cognito-sub
   * Manually link an existing IDP user to database user
   * Useful for users already created in IDP
   *
   * Body: { username, cognitoSub }
   */

  linkCognitoSub = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, cognitoSub } = req.body;

      if (!username || !cognitoSub) {
        return res.status(400).json({
          success: false,
          message: 'Username and cognitoSub are required',
        });
      }
      // Try User table
      const user = await prisma.user.findUnique({ where: { username } });

      if (user) {
        if (user.cognitoSub) {
          return res.status(400).json({
            success: false,
            message: 'User already linked',
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { cognitoSub },
        });

        return res.status(200).json({
          success: true,
          message: 'User linked successfully',
        });
      }

      // Try Client table
      const client = await prisma.client.findUnique({ where: { username } });

      if (client) {
        if (client.cognitoSub) {
          return res.status(400).json({
            success: false,
            message: 'Client already linked',
          });
        }

        await prisma.client.update({
          where: { id: client.id },
          data: { cognitoSub },
        });

        return res.status(200).json({
          success: true,
          message: 'Client linked successfully',
        });
      }

      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    } catch (error) {
      logger.error('Link error:', error);
      next(error);
    }
  });
}

export const migrationController = new MigrationController();
