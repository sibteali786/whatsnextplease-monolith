/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';

export class SSEManager {
  private clients: Map<string, Response> = new Map();

  addClient(id: string, res: Response) {
    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    this.clients.set(id, res);

    // Remove client when connection closes
    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  sendNotification(userId: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  broadcastNotification(data: any) {
    this.clients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
}
export const sseManager = new SSEManager();
