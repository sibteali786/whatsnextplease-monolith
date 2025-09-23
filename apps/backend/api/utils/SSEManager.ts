// apps/backend/api/utils/SSEManager.ts
import { Response } from 'express';
import { logger } from './logger';

interface ClientConnection {
  response: Response;
  lastPing: Date;
  isActive: boolean;
  reconnectAttempts: number;
  connectionId: string;
  tabId?: string; // Add tab identifier
  userAgent?: string; // Track user agent for debugging
  connectedAt: Date;
}

interface NotificationPayload {
  type: string;
  message: string;
  data: unknown;
}

export class SSEManager {
  // Change from Map<userId, connection> to Map<userId, Map<connectionId, connection>>
  private clients = new Map<string, Map<string, ClientConnection>>();
  private keepAliveIntervals = new Map<string, NodeJS.Timeout>();
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds

  /**
   * Add a new SSE client with multi-tab support
   */
  addClient(userId: string, res: Response, connectionId?: string, tabId?: string): void {
    // Generate unique connection ID if not provided
    const finalConnectionId =
      connectionId || `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get user agent for debugging
    const userAgent = res.req.headers['user-agent'] || 'unknown';

    logger.debug(
      {
        userId,
        connectionId: finalConnectionId,
        tabId,
        userAgent,
        existingUserConnections: this.getUserConnectionCount(userId),
        totalConnections: this.getTotalConnectionCount(),
      },
      'Adding new SSE client'
    );

    // Initialize user's connection map if it doesn't exist
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
    }

    const userConnections = this.clients.get(userId)!;

    const clientConnection: ClientConnection = {
      response: res,
      lastPing: new Date(),
      isActive: true,
      reconnectAttempts: 0,
      connectionId: finalConnectionId,
      tabId,
      userAgent,
      connectedAt: new Date(),
    };

    // Add the new connection
    userConnections.set(finalConnectionId, clientConnection);

    logger.info(
      {
        userId,
        connectionId: finalConnectionId,
        tabId,
        userConnections: userConnections.size,
        totalConnections: this.getTotalConnectionCount(),
        activeUsers: this.getActiveUsers(),
      },
      'SSE client connected'
    );

    // Send initial connection confirmation
    this.sendInitialMessage(userId, finalConnectionId);

    // Setup keep-alive for this user if not already exists
    this.setupKeepAlive(userId);

    // Handle connection cleanup
    this.setupConnectionHandlers(userId, finalConnectionId, res);
  }

  /**
   * Remove a specific client connection
   */
  removeClient(userId: string, connectionId?: string): void {
    const userConnections = this.clients.get(userId);
    if (!userConnections) {
      return;
    }

    if (connectionId) {
      // Remove specific connection
      const connection = userConnections.get(connectionId);
      if (connection) {
        try {
          if (!connection.response.destroyed) {
            connection.response.end();
          }
        } catch (error) {
          logger.error({ userId, connectionId, error }, 'Error closing specific connection');
        }

        userConnections.delete(connectionId);

        logger.info(
          {
            userId,
            connectionId,
            remainingConnections: userConnections.size,
            totalConnections: this.getTotalConnectionCount(),
          },
          'SSE client connection removed'
        );
      }
    } else {
      // Remove all connections for user (legacy behavior)
      for (const [connId, connection] of userConnections) {
        try {
          if (!connection.response.destroyed) {
            connection.response.end();
          }
        } catch (error) {
          logger.error({ userId, connectionId: connId, error }, 'Error closing connection');
        }
      }
      userConnections.clear();

      logger.info(
        {
          userId,
          totalConnections: this.getTotalConnectionCount(),
        },
        'All SSE connections removed for user'
      );
    }

    // Clean up user entry if no connections remain
    if (userConnections.size === 0) {
      this.clients.delete(userId);
      this.cleanupKeepAlive(userId);
    }
  }

  /**
   * Send notification to all active connections for a user
   */
  sendNotification(userId: string, notification: NotificationPayload): boolean {
    const userConnections = this.clients.get(userId);
    if (!userConnections || userConnections.size === 0) {
      logger.warn(
        {
          userId,
          notificationType: notification.type,
          totalUsers: this.clients.size,
        },
        'No active SSE connections found for user'
      );
      return false;
    }

    let successCount = 0;
    let failureCount = 0;
    const failedConnections: string[] = [];

    // Send to all active connections for this user
    for (const [connectionId, client] of userConnections) {
      if (!client.isActive || client.response.destroyed || !client.response.writable) {
        failedConnections.push(connectionId);
        failureCount++;
        continue;
      }

      try {
        const enhancedNotification = {
          ...notification,
          timestamp: new Date().toISOString(),
          connectionId,
          userId,
        };

        const data = JSON.stringify(enhancedNotification);
        client.response.write(`data: ${data}\n\n`);
        successCount++;

        logger.debug(
          {
            userId,
            connectionId,
            notificationType: notification.type,
            tabId: client.tabId,
          },
          'SSE notification sent to connection'
        );
      } catch (error) {
        logger.error(
          {
            userId,
            connectionId,
            notificationType: notification.type,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to send SSE notification to connection'
        );
        failedConnections.push(connectionId);
        failureCount++;
      }
    }

    // Clean up failed connections
    for (const connectionId of failedConnections) {
      this.removeClient(userId, connectionId);
    }

    logger.info(
      {
        userId,
        notificationType: notification.type,
        successCount,
        failureCount,
        totalConnections: userConnections.size,
        failedConnections,
      },
      'SSE notification delivery completed'
    );

    return successCount > 0;
  }

  /**
   * Check if user has any active connections
   */
  hasClient(userId: string): boolean {
    const userConnections = this.clients.get(userId);
    if (!userConnections) return false;

    // Check if any connection is active
    for (const connection of userConnections.values()) {
      if (connection.isActive && !connection.response.destroyed && connection.response.writable) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get count of active connections for a user
   */
  getUserConnectionCount(userId: string): number {
    const userConnections = this.clients.get(userId);
    return userConnections ? userConnections.size : 0;
  }

  /**
   * Get total number of active connections across all users
   */
  getTotalConnectionCount(): number {
    let total = 0;
    for (const userConnections of this.clients.values()) {
      total += userConnections.size;
    }
    return total;
  }

  /**
   * Get list of active users
   */
  getActiveUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get detailed connection info for monitoring
   */
  getConnectionDetails(): Array<{
    userId: string;
    connectionId: string;
    tabId?: string;
    connectedAt: Date;
    lastPing: Date;
    userAgent?: string;
  }> {
    const details: Array<{
      userId: string;
      connectionId: string;
      tabId?: string;
      connectedAt: Date;
      lastPing: Date;
      userAgent?: string;
    }> = [];

    for (const [userId, userConnections] of this.clients) {
      for (const [connectionId, connection] of userConnections) {
        details.push({
          userId,
          connectionId,
          tabId: connection.tabId,
          connectedAt: connection.connectedAt,
          lastPing: connection.lastPing,
          userAgent: connection.userAgent,
        });
      }
    }

    return details;
  }

  /**
   * Perform health check on all connections
   */
  performHealthCheck(userId: string): void {
    const userConnections = this.clients.get(userId);
    if (!userConnections) return;

    const staleConnections: string[] = [];
    const now = new Date();

    for (const [connectionId, client] of userConnections) {
      // Check if connection is stale
      const timeSinceLastPing = now.getTime() - client.lastPing.getTime();

      if (
        timeSinceLastPing > this.CONNECTION_TIMEOUT ||
        client.response.destroyed ||
        !client.response.writable
      ) {
        staleConnections.push(connectionId);
        continue;
      }

      // Send ping
      try {
        client.response.write(
          `data: ${JSON.stringify({
            type: 'ping',
            connectionId,
            timestamp: now.toISOString(),
          })}\n\n`
        );
        client.lastPing = now;
      } catch (error) {
        logger.error({ userId, connectionId, error }, 'Ping failed, marking connection as stale');
        staleConnections.push(connectionId);
      }
    }

    // Remove stale connections
    for (const connectionId of staleConnections) {
      logger.info({ userId, connectionId }, 'Removing stale SSE connection');
      this.removeClient(userId, connectionId);
    }
  }

  /**
   * Setup keep-alive for user (shared across all user's connections)
   */
  private setupKeepAlive(userId: string): void {
    if (this.keepAliveIntervals.has(userId)) {
      return; // Already setup
    }

    const keepAlive = setInterval(() => {
      this.performHealthCheck(userId);
    }, this.PING_INTERVAL);

    this.keepAliveIntervals.set(userId, keepAlive);
  }

  /**
   * Clean up keep-alive for user
   */
  private cleanupKeepAlive(userId: string): void {
    const keepAlive = this.keepAliveIntervals.get(userId);
    if (keepAlive) {
      clearInterval(keepAlive);
      this.keepAliveIntervals.delete(userId);
    }
  }

  /**
   * Send initial connection message
   */
  private sendInitialMessage(userId: string, connectionId: string): void {
    const userConnections = this.clients.get(userId);
    const connection = userConnections?.get(connectionId);

    if (!connection) return;

    try {
      connection.response.write(
        `data: ${JSON.stringify({
          type: 'connected',
          connectionId,
          userId,
          timestamp: new Date().toISOString(),
          message: 'SSE connection established',
          tabSupported: true,
        })}\n\n`
      );
    } catch (error) {
      logger.error({ userId, connectionId, error }, 'Failed to send initial connection message');
      this.removeClient(userId, connectionId);
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(userId: string, connectionId: string, res: Response): void {
    res.on('close', () => {
      logger.info({ userId, connectionId }, 'SSE client connection closed gracefully');
      this.removeClient(userId, connectionId);
    });

    res.on('error', error => {
      logger.error({ userId, connectionId, error }, 'SSE connection error');
      this.removeClient(userId, connectionId);
    });

    // Handle client disconnect
    res.req.on('close', () => {
      logger.info({ userId, connectionId }, 'Client disconnected');
      this.removeClient(userId, connectionId);
    });
  }

  /**
   * Graceful shutdown - close all connections
   */
  shutdown(): void {
    logger.info({ totalConnections: this.getTotalConnectionCount() }, 'Shutting down SSE Manager');

    for (const userId of this.clients.keys()) {
      this.removeClient(userId); // Remove all connections for user
    }

    // Clear all intervals
    for (const interval of this.keepAliveIntervals.values()) {
      clearInterval(interval);
    }
    this.keepAliveIntervals.clear();
  }
}

// Export singleton instance
export const sseManager = new SSEManager();
