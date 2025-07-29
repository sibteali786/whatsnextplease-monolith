import { Response } from 'express';
import { logger } from './logger';

// In your SSEManager utility
export class SSEManager {
  private clients: Map<string, Response> = new Map();

  addClient(userId: string, res: Response) {
    // Remove existing connection if any
    if (this.clients.has(userId)) {
      const existingRes = this.clients.get(userId);
      existingRes?.end();
    }

    this.clients.set(userId, res);
    logger.info(`SSE client connected: ${userId}`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      if (this.clients.has(userId)) {
        try {
          res.write('data: {"type":"ping"}\n\n');
        } catch (error) {
          if (error instanceof Error) {
            logger.error(`Failed to ping client ${userId}, removing connection`);
            this.removeClient(userId);
            clearInterval(keepAlive);
          }
        }
      } else {
        clearInterval(keepAlive);
      }
    }, 30000); // Ping every 30 seconds
  }

  removeClient(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      try {
        client.end();
      } catch (error) {
        logger.error(`Error closing SSE connection for ${userId}:`, error);
      }
      this.clients.delete(userId);
      logger.info(`SSE client removed: ${userId}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendNotification(userId: string, notification: any) {
    const client = this.clients.get(userId);
    if (client) {
      try {
        const data = JSON.stringify(notification);
        client.write(`data: ${data}\n\n`);
        logger.info(`Notification sent to ${userId}:`, notification);
      } catch (error) {
        logger.error(`Failed to send notification to ${userId}:`, error);
        this.removeClient(userId);
      }
    } else {
      logger.warn(`No SSE client found for user: ${userId}`);
    }
  }
}

export const sseManager = new SSEManager();
