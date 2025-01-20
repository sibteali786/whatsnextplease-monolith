import { pino } from 'pino';
import { LoggerConfig } from '@wnp/types';
import { DEFAULT_REDACT } from './constants';

export const createLogger = (config: LoggerConfig = {}) => {
  const {
    level = process.env.LOG_LEVEL || 'info',
    development = process.env.NODE_ENV === 'development',
    redact = DEFAULT_REDACT,
  } = config;

  const transport = development
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
            ignore: 'pid,hostname',
          },
        },
      }
    : {};

  return pino({
    ...transport,
    level,
    redact: {
      paths: redact,
      remove: true,
    },
    formatters: {
      level: label => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
    base: {
      env: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    },
  });
};
