import { createLogger } from '@wnp/logger';
export const logger = createLogger({
  development: process.env.NODE_ENV === 'development',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  level: (process.env.LOG_LEVEL as any) || 'debug',
});
