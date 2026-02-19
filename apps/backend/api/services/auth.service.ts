import prisma from '../config/db';
import { Roles } from '@prisma/client';
import { logger } from '../utils/logger';
import { comparePwd, hashPW } from '../utils/auth/hashPW';
import { getIdpAdminService } from './idp/IdpAdminFactory';
import { tokenExchangeService } from './idp/TokenExchangeService';
import { emailVerificationService } from './emailVerification.service';
import * as jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const idpAdmin = getIdpAdminService();
interface SigninRequest {
  username: string;
  password: string;
}

interface SigninResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  user?: any;
  client?: any;
  migrated?: boolean;
  usedLegacy?: boolean;
  message?: string;
  error?: string;
}

interface SignupRequest {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactName?: string;
  role: Roles;
}

interface SignupResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  refreshExpiresIn?: number;
  expiresIn?: number;
  user?: any;
  client?: any;
  message?: string;
  error?: string;
}

export class AuthService {
  /**
   * Signin with auto-migration
   * 1. Validate credentials
   * 2. Check if user needs migration
   * 3. If YES: Migrate to IDP, get IDP token
   * 4. If NO: Get IDP token directly
   * 5. Fallback to legacy JWT if IDP fails
   */
  async signin(request: SigninRequest): Promise<SigninResponse> {
    const { username, password } = request;

    try {
      // 1. Find user in database (User or Client)
      let entity: any = null;
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
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }

      // 2. Verify password (even if migrated, we keep passwordHash for fallback)
      if (!entity.passwordHash) {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }

      const isValidPassword = await comparePwd(password, entity.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }

      // 3. Check if user needs migration
      if (!entity.cognitoSub) {
        logger.info(`User ${username} needs migration to IDP`);

        // Migrate user to IDP
        const migrationResult = await this.migrateUserToIdp(entity, entityType!, password);

        if (!migrationResult.success) {
          // Migration failed, fallback to legacy JWT
          logger.warn(`Migration failed for ${username}, using legacy JWT`);
          return this.createLegacyJwtResponse(entity, entityType!);
        }

        // Migration successful
        return {
          success: true,
          token: migrationResult.token!,
          [entityType === 'user' ? 'user' : 'client']: this.sanitizeEntity(entity),
          migrated: true,
          message: 'Logged in successfully (account upgraded)',
        };
      }

      // 4. User already migrated, get IDP token
      const tokenResult = await tokenExchangeService.getTokenWithPassword(username, password);

      if (!tokenResult.success) {
        // IDP token failed, fallback to legacy JWT
        logger.warn(`IDP token failed for ${username}, using legacy JWT`);
        return this.createLegacyJwtResponse(entity, entityType!);
      }

      return {
        success: true,
        token: tokenResult.tokens!.access_token,
        refreshToken: tokenResult.tokens!.refresh_token, // ADD THIS
        expiresIn: tokenResult.tokens!.expires_in,
        refreshExpiresIn: tokenResult.tokens!.refresh_expires_in,
        [entityType === 'user' ? 'user' : 'client']: this.sanitizeEntity(entity),
        message: 'Logged in successfully',
      };
    } catch (error) {
      logger.error('Signin error:', error);
      return {
        success: false,
        error: 'An error occurred during signin',
      };
    }
  }

  /**
   * Migrate existing user to IDP
   */
  private async migrateUserToIdp(
    entity: any,
    entityType: 'user' | 'client',
    password: string
  ): Promise<{
    success: boolean;
    token?: string;
    error?: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
  }> {
    try {
      // 1. Determine IDP group
      const role = entityType === 'client' ? Roles.CLIENT : entity.role?.name;
      const idpGroups = [idpAdmin.mapRoleToGroup(role)];

      // 2. Create user in IDP
      const createResult = await idpAdmin.createUser({
        username: entity.username,
        email: entity.email,
        firstName: entityType === 'user' ? entity.firstName : entity.contactName,
        lastName: entityType === 'user' ? entity.lastName : entity.companyName,
        password,
        groups: idpGroups,
      });

      if (!createResult.success) {
        logger.error(`Failed to create IDP user: ${createResult.error}`);
        return {
          success: false,
          error: createResult.error,
        };
      }

      // 3. Update database with cognitoSub (within transaction)
      await prisma.$transaction(async tx => {
        if (entityType === 'user') {
          await tx.user.update({
            where: { id: entity.id },
            data: { cognitoSub: createResult.sub },
          });
        } else {
          await tx.client.update({
            where: { id: entity.id },
            data: { cognitoSub: createResult.sub },
          });
        }
      });

      logger.info(`✅ Migrated ${entityType} ${entity.username} to IDP (${createResult.sub})`);

      // 4. Get IDP token
      const tokenResult = await tokenExchangeService.getTokenWithPassword(
        entity.username,
        password
      );

      if (!tokenResult.success) {
        return {
          success: false,
          error: 'Migration succeeded but failed to get token',
        };
      }

      return {
        success: true,
        token: tokenResult.tokens!.access_token,
        refreshToken: tokenResult.tokens!.refresh_token,
        expiresIn: tokenResult.tokens!.expires_in,
        refreshExpiresIn: tokenResult.tokens!.refresh_expires_in,
      };
    } catch (error) {
      logger.error(`Migration error:${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      };
    }
  }
  /**
   * Create legacy JWT token (fallback)
   */
  private createLegacyJwtResponse(entity: any, entityType: 'user' | 'client'): SigninResponse {
    const SECRET = process.env.SECRET!;

    const role = entityType === 'client' ? Roles.CLIENT : entity.role?.name || Roles.TASK_AGENT;

    const token = jwt.sign(
      {
        id: entity.id,
        username: entity.username,
        role,
      },
      SECRET,
      { expiresIn: '12h' }
    );

    return {
      success: true,
      token,
      [entityType === 'user' ? 'user' : 'client']: this.sanitizeEntity(entity),
      usedLegacy: true,
      message: 'Logged in successfully (legacy mode)',
    };
  }

  /**
   * Signup - Create user in IDP first, then database
   */
  async signup(request: SignupRequest): Promise<SignupResponse> {
    const { email, password, username, firstName, lastName, companyName, contactName, role } =
      request;

    try {
      // 1. Validate input
      if (role === Roles.CLIENT && !companyName) {
        return {
          success: false,
          error: 'Company name is required for clients',
        };
      }

      if (role !== Roles.CLIENT && (!firstName || !lastName)) {
        return {
          success: false,
          error: 'First name and last name are required',
        };
      }

      // 2. Check if username/email already exists
      const existing = await prisma.$transaction([
        prisma.user.findFirst({
          where: { OR: [{ username }, { email }] },
        }),
        prisma.client.findFirst({
          where: { OR: [{ username }, { email }] },
        }),
      ]);

      if (existing[0] || existing[1]) {
        return {
          success: false,
          error: 'Username or email already exists',
        };
      }

      // 3. Determine IDP group
      const idpGroups = [idpAdmin.mapRoleToGroup(role)];

      // 4. Create user in IDP FIRST (atomic operation #1)
      const idpResult = await idpAdmin.createUser({
        username,
        email,
        firstName: role === Roles.CLIENT ? contactName || username : firstName,
        lastName: role === Roles.CLIENT ? companyName : lastName,
        password,
        groups: idpGroups,
      });

      if (!idpResult.success) {
        return {
          success: false,
          error: `Failed to create account: ${idpResult.error}`,
        };
      }

      const cognitoSub = idpResult.sub!;

      // 5. Create user in database WITH cognitoSub (atomic operation #2)
      try {
        let entity: any;
        const hashedPassword = await hashPW(password);

        if (role === Roles.CLIENT) {
          entity = await prisma.client.create({
            data: {
              username,
              email,
              passwordHash: hashedPassword,
              companyName: companyName ?? '',
              contactName: contactName ?? '',
              cognitoSub,
              emailVerified: false,
              role: { connect: { name: Roles.CLIENT } },
            },
            include: { role: true },
          });
        } else {
          entity = await prisma.user.create({
            data: {
              username,
              email,
              passwordHash: hashedPassword,
              firstName: firstName ?? '',
              lastName: lastName ?? '',
              cognitoSub,
              emailVerified: false,
              role: { connect: { name: role } },
            },
            include: { role: true },
          });
        }

        logger.info(`Created ${role} ${username} in database with cognitoSub: ${cognitoSub}`);

        // 6. Get IDP token
        const tokenResult = await tokenExchangeService.getTokenWithPassword(username, password);

        if (!tokenResult.success) {
          // Token failed but user exists, they can login later
          logger.warn('Signup successful but failed to get initial token');
          return {
            success: true,
            [role === Roles.CLIENT ? 'client' : 'user']: this.sanitizeEntity(entity),
            message: 'Account created successfully. Please login.',
          };
        }

        // 7. Send verification email (don't block on this)
        emailVerificationService
          .createAndSendVerificationToken({
            entityId: entity.id,
            entityRole: role,
            email,
            name:
              role === Roles.CLIENT ? contactName || companyName || '' : `${firstName} ${lastName}`,
          })
          .catch(error => {
            logger.error('Failed to send verification email:', error);
          });

        return {
          success: true,
          token: tokenResult.tokens!.access_token,
          refreshToken: tokenResult.tokens!.refresh_token,
          expiresIn: tokenResult.tokens!.expires_in,
          refreshExpiresIn: tokenResult.tokens!.refresh_expires_in,
          [role === Roles.CLIENT ? 'client' : 'user']: this.sanitizeEntity(entity),
          message: 'Account created successfully',
        };
      } catch (dbError) {
        // Database creation failed, rollback IDP user
        logger.error('Database user creation failed, rolling back IDP user:', dbError);

        await idpAdmin.deleteUser(cognitoSub).catch(deleteError => {
          logger.error('Failed to rollback IDP user:', deleteError);
        });

        return {
          success: false,
          error: 'Failed to create account (database error)',
        };
      }
    } catch (error) {
      logger.error('Signup error:', error);
      return {
        success: false,
        error: 'An error occurred during signup',
      };
    }
  }

  /**
   * Get current user or client entity from token
   * Handles both legacy JWT and IDP tokens
   */
  async getCurrentEntityFromToken(token: string): Promise<{
    success: boolean;
    user?: any;
    client?: any;
    error?: string;
  }> {
    try {
      let payload: any;
      let entity: any = null;
      let entityType: 'user' | 'client' | null = null;

      // Try legacy JWT verification first
      try {
        payload = jwt.verify(token, process.env.SECRET!) as { id: string; username: string };
        entity =
          (await prisma.user.findUnique({
            where: { id: payload.id, username: payload.username },
            include: { role: true },
          })) ||
          (await prisma.client.findUnique({
            where: { id: payload.id, username: payload.username },
            include: { role: true },
          }));
        entityType = entity ? (entity.firstName !== undefined ? 'user' : 'client') : null;
      } catch {
        // Fallback: IDP token (decode only)
        const decoded = jwt.decode(token) as any;
        if (!decoded) return { success: false, error: 'Invalid token' };

        const sub = decoded.sub || decoded['cognito:username'];
        if (!sub) return { success: false, error: 'Invalid token payload' };

        entity =
          (await prisma.user.findUnique({
            where: { cognitoSub: sub },
            include: { role: true },
          })) ||
          (await prisma.client.findUnique({
            where: { cognitoSub: sub },
            include: { role: true },
          }));
        entityType = entity ? (entity.firstName !== undefined ? 'user' : 'client') : null;
      }

      if (!entity || !entityType) {
        return { success: false, error: 'Invalid or expired token' };
      }

      const sanitized = this.sanitizeEntity(entity);
      return {
        success: true,
        user: entityType === 'user' ? sanitized : undefined,
        client: entityType === 'client' ? sanitized : undefined,
      };
    } catch (error) {
      logger.error('getCurrentEntityFromToken error:', error);
      return { success: false, error: 'Failed to get current user' };
    }
  }
  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
    error?: string;
  }> {
    try {
      const provider = env.AUTH_PROVIDER;

      if (provider === 'keycloak') {
        return await this.refreshKeycloakToken(refreshToken);
      } else if (provider === 'cognito') {
        return await this.refreshCognitoToken(refreshToken);
      }

      return {
        success: false,
        error: `Unknown AUTH_PROVIDER: ${provider}`,
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Refresh Keycloak token
   */
  private async refreshKeycloakToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const keycloakUrl = env.KEYCLOAK_URL;
    const realm = env.KEYCLOAK_REALM;
    const clientId = env.KEYCLOAK_CLIENT_ID;

    if (!clientId) {
      return {
        success: false,
        error: 'KEYCLOAK_CLIENT_ID not configured',
      };
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.debug(`Keycloak refresh error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Token refresh failed: ${response.status}`,
        };
      }

      const tokens = await response.json();

      logger.info('✅ Successfully refreshed Keycloak token');

      return {
        success: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token, // Keycloak returns new refresh token
        expiresIn: tokens.expires_in,
      };
    } catch (error) {
      logger.error('Keycloak token refresh failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Refresh Cognito token (for future use)
   */
  private async refreshCognitoToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const region = env.AWS_REGION;
    const clientId = env.COGNITO_CLIENT_ID;

    if (!clientId) {
      return {
        success: false,
        error: 'COGNITO_CLIENT_ID not configured',
      };
    }

    const client = new CognitoIdentityProviderClient({ region });

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await client.send(command);

      if (!response.AuthenticationResult) {
        return {
          success: false,
          error: 'No authentication result from Cognito',
        };
      }

      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn,
      };
    } catch (error) {
      logger.error('Cognito token refresh failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }
  /**
   * Remove sensitive fields from entity
   */
  private sanitizeEntity(entity: any) {
    const { passwordHash, ...sanitized } = entity;
    return sanitized;
  }
}

export const authService = new AuthService();
