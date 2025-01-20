import { createLogger } from '@wnp/logger';
export const logger = createLogger({
  development: process.env.NODE_ENV === 'development',
  level:
    (process.env.LOG_LEVEL as
      | 'debug'
      | 'fatal'
      | 'error'
      | 'warn'
      | 'debug'
      | 'trace'
      | undefined) || 'info',
});
