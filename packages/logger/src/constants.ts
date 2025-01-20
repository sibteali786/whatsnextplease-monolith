export const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

export const DEFAULT_REDACT = [
  'password',
  'token',
  'authorization',
  'cookie',
  'jwt',
  'bearer',
  '*.password',
  '*.token',
  '*.authorization',
  '*.cookie',
  '*.jwt',
  '*.bearer',
];
