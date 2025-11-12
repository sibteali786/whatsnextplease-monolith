import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const CHAT_APP_URL = env.CHAT_APP_API_URL || 'http://localhost:5002';
const CHAT_SHARED_SECRET = env.CHAT_SHARED_SECRET!;
const TENANT_ID = env.TENANT_ID || 'whatsnextplease';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role?: string;
    contactName: string;
  };
}

export class ChatController {
  /**
   * Register WNP as tenant in Chat App
   * This now uses the credentials provided by Chat App admin
   */
  static async registerTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, domain, adminEmail, name } = req.body;

      // Validate inputs
      if (!tenantId || !domain || !adminEmail || !name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, domain, adminEmail, name',
        });
      }

      // Get credentials from environment
      const sharedSecret = env.CHAT_SHARED_SECRET;
      const registrationToken = env.CHAT_APP_REGISTRATION_TOKEN;

      if (!sharedSecret || !registrationToken) {
        return res.status(500).json({
          success: false,
          error:
            'Missing chat credentials in backend. Please update AWS Secrets Manager with CHAT_SHARED_SECRET and CHAT_APP_REGISTRATION_TOKEN, then redeploy.',
        });
      }

      // Parse allowed origins
      const raw = env.ALLOWED_ORIGINS || '[]';
      let allowedOrigins: string[] = [];
      try {
        const maybeValue = raw.includes('=') ? raw.split('=')[1] : raw;
        const normalized = maybeValue.trim().replace(/'/g, '"');
        allowedOrigins = JSON.parse(normalized);
        if (!Array.isArray(allowedOrigins)) {
          throw new Error('ALLOWED_ORIGINS parsed to non-array');
        }
      } catch (err) {
        logger.warn('Failed to parse ALLOWED_ORIGINS, falling back to empty array', { raw, err });
        allowedOrigins = [];
      }

      // Call Chat App registration endpoint
      const response = await fetch(`${CHAT_APP_URL}/api/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          domain,
          allowedOrigins,
          sharedSecret,
          registrationToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('Chat app registration failed', data);
        logger.info('Chat app registration failed', { data });
        throw new Error(data.error || 'Registration failed');
      }

      logger.info('Tenant registered successfully', { tenantId, domain });

      res.json({
        success: true,
        message: 'Chat integration enabled successfully',
        tenant: data.tenant,
      });
    } catch (error) {
      logger.error('Tenant registration error', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register tenant',
      });
    }
  }

  /**
   * Generate signed token for chat authentication
   */
  static async generateInitToken(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      // Sometimes when its a client we will have to fetch user details from DB for CLIENT entity
      let user;
      if (req.user?.role === 'CLIENT') {
        user = await prisma.client.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            contactName: true,
            companyName: true,
            avatarUrl: true,
          },
        });
      } else {
        user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create token payload
      const payload = {
        tenantUserId: user.id,
        email: user.email,
        name:
          req.user?.role === 'CLIENT'
            ? `${(user as { contactName: string }).contactName}`.trim()
            : `${(user as { firstName: string; lastName: string }).firstName} ${(user as { firstName: string; lastName: string }).lastName}`.trim(),
        avatarUrl: user.avatarUrl || undefined,
        tenantId: TENANT_ID,
        externalSystem: 'wnp',
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex'),
        iss: 'whatnextplease',
        aud: 'chat-app',
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      };

      // Encode payload
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');

      // Sign token
      const signature = crypto.createHmac('sha256', CHAT_SHARED_SECRET).update(token).digest('hex');

      res.json({
        success: true,
        token,
        signature,
        chatUrl: CHAT_APP_URL,
      });
    } catch (error) {
      console.error('Token generation error:', error);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  }
}
