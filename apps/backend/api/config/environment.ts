import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string(),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  WEB_PUSH_EMAIL: z.string().email(),
});

type EnvSchema = z.infer<typeof envSchema>;

class EnvironmentService {
  private static instance: EnvironmentService;
  private config: EnvSchema;

  private constructor() {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    try {
      this.config = envSchema.parse(process.env);
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
