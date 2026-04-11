import crypto from 'crypto';
import { logger } from '../utils/logger';

interface SSETokenEntry {
  userId: string;
  expiresAt: number;
  used: boolean;
}

class SSETokenService {
  // In-memory store — fast, no DB overhead for short-lived tokens
  // Key: sseToken, Value: entry
  private tokens = new Map<string, SSETokenEntry>();
  private readonly TTL_MS = 60_000; // 60 seconds

  constructor() {
    // Sweep expired tokens every 2 minutes to prevent memory leak
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  issue(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, {
      userId,
      expiresAt: Date.now() + this.TTL_MS,
      used: false,
    });
    logger.debug({ userId }, 'SSE token issued');
    return token;
  }

  /**
   * Validate and immediately invalidate (single-use)
   */
  consume(token: string, userId: string): boolean {
    const entry = this.tokens.get(token);

    if (!entry) {
      logger.warn({ userId }, 'SSE token not found');
      return false;
    }
    if (entry.used) {
      logger.warn({ userId }, 'SSE token already used');
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.tokens.delete(token);
      logger.warn({ userId }, 'SSE token expired');
      return false;
    }
    if (entry.userId !== userId) {
      logger.warn({ userId, tokenUserId: entry.userId }, 'SSE token userId mismatch');
      return false;
    }

    // Mark used and delete — single use enforced
    this.tokens.delete(token);
    logger.debug({ userId }, 'SSE token consumed successfully');
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [token, entry] of this.tokens) {
      if (now > entry.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
}

// Singleton — shared across the process
export const sseTokenService = new SSETokenService();
