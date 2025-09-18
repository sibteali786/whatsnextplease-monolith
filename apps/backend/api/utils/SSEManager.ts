/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { logger } from './logger';

interface ClientConnection {
  response: Response;
  lastPing: Date;
  isActive: boolean;
  reconnectAttempts: number;
  connectionId: string;
}

export class SSEManager {
  private clients: Map<string, ClientConnection> = new Map();
  private keepAliveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 90000; // 90 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  constructor() {
    // Cleanup stale connections every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 120000);
  }
  hasClient(userId: string): boolean {
    return this.clients.has(userId) && this.clients.get(userId)?.isActive === true;
  }

  getActiveClientsCount(): number {
    return Array.from(this.clients.values()).filter(client => client.isActive).length;
  }

  getActiveClients(): string[] {
    return Array.from(this.clients.entries())
      .filter(([, client]) => client.isActive)
      .map(([userId]) => userId);
  }

  addClient(userId: string, res: Response) {
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.debug(
      {
        userId,
        connectionId,
        existingConnection: this.clients.has(userId),
        totalConnections: this.clients.size,
      },
      'Adding SSE client'
    );

    // Gracefully close existing connection if any
    this.removeClient(userId);

    const clientConnection: ClientConnection = {
      response: res,
      lastPing: new Date(),
      isActive: true,
      reconnectAttempts: 0,
      connectionId,
    };

    this.clients.set(userId, clientConnection);

    logger.info(
      {
        userId,
        connectionId,
        totalConnections: this.getActiveClientsCount(),
        activeClients: this.getActiveClients(),
      },
      'SSE client connected'
    );

    // Send initial connection confirmation with connection metadata
    try {
      res.write(
        `data: ${JSON.stringify({
          type: 'connected',
          connectionId,
          timestamp: new Date().toISOString(),
          message: 'SSE connection established',
        })}\n\n`
      );
    } catch (error) {
      logger.error({ userId, connectionId, error }, 'Failed to send initial connection message');
      this.removeClient(userId);
      return;
    }

    // Setup enhanced keep-alive with health checks
    const keepAlive = setInterval(() => {
      this.performHealthCheck(userId);
    }, this.PING_INTERVAL);

    this.keepAliveIntervals.set(userId, keepAlive);

    // Handle connection events with better error handling
    res.on('close', () => {
      logger.info({ userId, connectionId }, 'SSE client connection closed gracefully');
      this.removeClient(userId);
    });

    res.on('error', error => {
      logger.error(
        {
          userId,
          connectionId,
          error: error.message,
        },
        'SSE connection error occurred'
      );
      this.removeClient(userId);
    });

    // Handle client timeout
    res.on('timeout', () => {
      logger.warn({ userId, connectionId }, 'SSE connection timed out');
      this.removeClient(userId);
    });
  }

  private performHealthCheck(userId: string) {
    const client = this.clients.get(userId);
    if (!client || !client.isActive) {
      return;
    }

    try {
      if (client.response && !client.response.destroyed && client.response.writable) {
        const pingData = {
          type: 'ping',
          timestamp: new Date().toISOString(),
          connectionId: client.connectionId,
        };

        client.response.write(`data: ${JSON.stringify(pingData)}\n\n`);
        client.lastPing = new Date();

        logger.debug({ userId, connectionId: client.connectionId }, 'SSE ping sent successfully');
      } else {
        logger.warn(
          {
            userId,
            connectionId: client.connectionId,
            destroyed: client.response?.destroyed,
            writable: client.response?.writable,
          },
          'SSE client in invalid state, removing'
        );
        this.removeClient(userId);
      }
    } catch (error) {
      logger.error(
        {
          userId,
          connectionId: client.connectionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to ping SSE client, removing connection'
      );
      this.removeClient(userId);
    }
  }

  private cleanupStaleConnections() {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [userId, client] of this.clients.entries()) {
      const timeSinceLastPing = now.getTime() - client.lastPing.getTime();

      if (timeSinceLastPing > this.CONNECTION_TIMEOUT) {
        staleConnections.push(userId);
      }
    }

    if (staleConnections.length > 0) {
      logger.info(
        { staleConnections, count: staleConnections.length },
        'Cleaning up stale SSE connections'
      );

      staleConnections.forEach(userId => this.removeClient(userId));
    }
  }

  removeClient(userId: string) {
    const client = this.clients.get(userId);
    if (!client) {
      return;
    }

    try {
      if (client.response && !client.response.destroyed) {
        // Send closure notification before closing
        try {
          client.response.write(
            `data: ${JSON.stringify({
              type: 'disconnecting',
              message: 'Server closing connection',
              connectionId: client.connectionId,
            })}\n\n`
          );
        } catch (writeError) {
          console.error('Error sending disconnecting message:', writeError);
          // Ignore write errors during closure
        }

        client.response.end();
      }
    } catch (error) {
      logger.error(
        {
          userId,
          connectionId: client.connectionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error closing SSE connection'
      );
    }

    // Mark as inactive immediately
    client.isActive = false;
    this.clients.delete(userId);

    // Clear keep-alive interval
    const interval = this.keepAliveIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(userId);
    }

    logger.info(
      {
        userId,
        connectionId: client.connectionId,
        totalConnections: this.getActiveClientsCount(),
        activeClients: this.getActiveClients(),
      },
      'SSE client removed'
    );
  }

  sendNotification(userId: string, notification: any) {
    const client = this.clients.get(userId);

    logger.debug(
      {
        userId,
        notificationType: notification.type,
        hasClient: !!client,
        isActive: client?.isActive,
        totalConnections: this.getActiveClientsCount(),
      },
      'Attempting to send SSE notification'
    );

    if (!client || !client.isActive) {
      logger.warn(
        {
          userId,
          notificationType: notification.type,
          hasClient: !!client,
          isActive: client?.isActive,
          totalConnections: this.getActiveClientsCount(),
          activeClients: this.getActiveClients(),
        },
        'No active SSE client found for notification'
      );
      return false;
    }

    if (client.response && !client.response.destroyed && client.response.writable) {
      try {
        const enhancedNotification = {
          ...notification,
          timestamp: new Date().toISOString(),
          connectionId: client.connectionId,
        };

        const data = JSON.stringify(enhancedNotification);
        client.response.write(`data: ${data}\n\n`);

        logger.info(
          {
            userId,
            notificationType: notification.type,
            connectionId: client.connectionId,
            dataLength: data.length,
          },
          'SSE notification sent successfully'
        );

        return true;
      } catch (error) {
        logger.error(
          {
            userId,
            notificationType: notification.type,
            connectionId: client.connectionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to send SSE notification'
        );
        this.removeClient(userId);
        return false;
      }
    } else {
      logger.warn(
        {
          userId,
          notificationType: notification.type,
          connectionId: client.connectionId,
          clientDestroyed: client.response?.destroyed,
          clientWritable: client.response?.writable,
        },
        'SSE client connection in invalid state'
      );
      this.removeClient(userId);
      return false;
    }
  }

  // Graceful shutdown
  shutdown() {
    logger.info('Shutting down SSE Manager');

    clearInterval(this.cleanupInterval);

    // Close all client connections gracefully
    for (const userId of this.clients.keys()) {
      this.removeClient(userId);
    }

    // Clear all intervals
    for (const interval of this.keepAliveIntervals.values()) {
      clearInterval(interval);
    }

    this.keepAliveIntervals.clear();
    this.clients.clear();
  }

  // Get connection statistics for monitoring
  getStats() {
    const stats = {
      totalClients: this.clients.size,
      activeClients: this.getActiveClientsCount(),
      clientConnections: Array.from(this.clients.entries()).map(([userId, client]) => ({
        userId,
        connectionId: client.connectionId,
        isActive: client.isActive,
        lastPing: client.lastPing,
        reconnectAttempts: client.reconnectAttempts,
      })),
    };

    return stats;
  }
}

export const sseManager = new SSEManager();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  sseManager.shutdown();
});

process.on('SIGINT', () => {
  sseManager.shutdown();
});
