export interface LoggerConfig {
  level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  development?: boolean;
  redact?: string[];
}

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  fatal: (obj: LogContext | Error | string, msg?: string) => void;
  error: (obj: LogContext | Error | string, msg?: string) => void;
  warn: (obj: LogContext | Error | string, msg?: string) => void;
  info: (obj: LogContext | Error | string, msg?: string) => void;
  debug: (obj: LogContext | Error | string, msg?: string) => void;
  trace: (obj: LogContext | Error | string, msg?: string) => void;
}
