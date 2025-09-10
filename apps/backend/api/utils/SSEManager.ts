/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { logger } from './logger';

export class SSEManager {
  private clients: Map<string, Response> = new Map();
  private keepAliveIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Add this method for debugging
  hasClient(userId: string): boolean {
    return this.clients.has(userId);
  }

  // Add this method for debugging
  getActiveClientsCount(): number {
    return this.clients.size;
  }

  // Add this method for debugging
  getActiveClients(): string[] {
    return Array.from(this.clients.keys());
  }

  addClient(userId: string, res: Response) {
    logger.debug(
      {
        userId,
        existingConnection: this.clients.has(userId),
        totalConnections: this.clients.size,
      },
      'Adding SSE client'
    );

    // Remove existing connection if any
    this.removeClient(userId);

    this.clients.set(userId, res);

    logger.info(
      {
        userId,
        totalConnections: this.clients.size,
        activeClients: this.getActiveClients(),
      },
      'SSE client connected'
    );

    // Enhanced keep-alive with better error handling
    const keepAlive = setInterval(() => {
      if (this.clients.has(userId)) {
        try {
          const client = this.clients.get(userId);
          if (client && !client.destroyed && client.writable) {
            client.write('data: {"type":"ping"}\n\n');
            logger.debug({ userId }, 'SSE ping sent successfully');
          } else {
            logger.warn(
              {
                userId,
                destroyed: client?.destroyed,
                writable: client?.writable,
              },
              'SSE client in invalid state, removing'
            );
            this.removeClient(userId);
          }
        } catch (error) {
          logger.error(
            {
              userId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Failed to ping SSE client, removing connection'
          );
          this.removeClient(userId);
        }
      }
    }, 25000);

    this.keepAliveIntervals.set(userId, keepAlive);

    // Handle connection events
    res.on('close', () => {
      logger.info({ userId }, 'SSE client connection closed');
      this.removeClient(userId);
    });

    res.on('error', error => {
      logger.error(
        {
          userId,
          error: error.message,
        },
        'SSE connection error occurred'
      );
      this.removeClient(userId);
    });
  }

  removeClient(userId: string) {
    const hadClient = this.clients.has(userId);

    if (hadClient) {
      const client = this.clients.get(userId);
      try {
        if (client && !client.destroyed) {
          client.end();
        }
      } catch (error) {
        logger.error(
          {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Error closing SSE connection'
        );
      }
      this.clients.delete(userId);
    }

    // Clear keep-alive interval
    const interval = this.keepAliveIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(userId);
    }

    if (hadClient) {
      logger.info(
        {
          userId,
          totalConnections: this.clients.size,
          activeClients: this.getActiveClients(),
        },
        'SSE client removed'
      );
    }
  }

  sendNotification(userId: string, notification: any) {
    logger.debug(
      {
        userId,
        notificationType: notification.type,
        hasClient: this.clients.has(userId),
        totalConnections: this.clients.size,
      },
      'Attempting to send SSE notification'
    );

    const client = this.clients.get(userId);
    if (client && !client.destroyed && client.writable) {
      try {
        const data = JSON.stringify(notification);
        client.write(`data: ${data}\n\n`);

        logger.info(
          {
            userId,
            notificationType: notification.type,
            dataLength: data.length,
          },
          'SSE notification sent successfully'
        );
      } catch (error) {
        logger.error(
          {
            userId,
            notificationType: notification.type,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to send SSE notification'
        );
        this.removeClient(userId);
      }
    } else {
      logger.warn(
        {
          userId,
          notificationType: notification.type,
          hasClient: !!client,
          clientDestroyed: client?.destroyed,
          clientWritable: client?.writable,
          totalConnections: this.clients.size,
          activeClients: this.getActiveClients(),
        },
        'No active SSE client found for notification'
      );
    }
  }
}

export const sseManager = new SSEManager();
