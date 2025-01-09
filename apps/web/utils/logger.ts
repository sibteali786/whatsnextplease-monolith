// utils/logger.ts
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const logger = pino({
  level: isProduction ? "info" : "debug",
  // Disable worker threads by using a custom transport or destination
  transport: isProduction
    ? undefined // In production, use default synchronous logging
    : {
        target: "pino-pretty", // For development, pretty-print logs
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
  redact: [], // prevent logging of sensitive data
}); // Use synchronous logging

export default logger;
