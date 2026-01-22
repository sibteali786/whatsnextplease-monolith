import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Simple OS-based port detection
const getDefaultPort = (): string => {
  // Check if PORT is explicitly set in environment
  if (process.env.PORT) {
    return process.env.PORT;
  }

  // Production always uses 3000
  if (process.env.NODE_ENV === 'production') {
    return '3000';
  }

  // macOS uses 5001, others use 5000
  return os.platform() === 'darwin' ? '5001' : '5000';
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(getDefaultPort()),
  DATABASE_URL: z.string(),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  WEB_PUSH_EMAIL: z.string().email(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SES_FROM_EMAIL: z.string().email(),
  SES_FROM_NAME: z.string().min(1),
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: z.string(),
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: z.string(),
  CHAT_APP_API_URL: z.string().url().default('http://localhost:5002'),
  CHAT_SHARED_SECRET: z.string().min(64),
  CHAT_APP_REGISTRATION_TOKEN: z.string().min(64),
  TENANT_ID: z.string().min(1).default('whatsnextplease'),
  ALLOWED_ORIGINS: z
    .string()
    .default(
      "['http://localhost:3000','http://localhost:5000','https://api.whatsnextplease.com','https://api-staging.whatsnextplease.com','https://app.whatsnextplease.com','https://app-staging.whatsnextplease.com']"
    ),

  // Add Authentication Configuration
  AUTH_PROVIDER: z.enum(['cognito', 'keycloak']).default('keycloak'),

  // Cognito (optional for local, required for staging/prod)
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  COGNITO_DOMAIN: z.string().optional(),

  // Keycloak (optional for staging/prod, required for local)
  KEYCLOAK_URL: z.string().url().optional(),
  KEYCLOAK_REALM: z.string().optional(),
  KEYCLOAK_CLIENT_ID: z.string().optional(),
  KEYCLOAK_ADMIN_USERNAME: z.string().optional(),
  KEYCLOAK_ADMIN_PASSWORD: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

class EnvironmentService {
  private static instance: EnvironmentService;
  private config: EnvSchema;

  private constructor() {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    try {
      this.config = envSchema.parse(process.env);

      // Log OS-specific port selection
      if (process.env.NODE_ENV === 'development') {
        const platform = os.platform();
        const platformName =
          platform === 'darwin'
            ? 'macOS'
            : platform === 'win32'
              ? 'Windows'
              : platform === 'linux'
                ? 'Linux'
                : platform;
        logger.info(`Detected ${platformName} - using port ${this.config.PORT}`);
      }

      logger.info('Environment variables loaded and validated successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
        logger.error(`Missing or invalid environment variables: ${missingVars}`);
        throw new Error(`Environment validation failed: ${missingVars}`);
      }
      throw error;
    }
  }

  static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  get env(): EnvSchema {
    return this.config;
  }

  getVapidConfig() {
    return {
      publicKey: this.config.VAPID_PUBLIC_KEY,
      privateKey: this.config.VAPID_PRIVATE_KEY,
      email: this.config.WEB_PUSH_EMAIL,
    };
  }
}

export const environmentService = EnvironmentService.getInstance();
export const env = environmentService.env;
