"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEManager = void 0;
class SSEManager {
    clients = new Map();
    addClient(id, res) {
        // SSE headers
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });
        this.clients.set(id, res);
        // Remove client when connection closes
        res.on("close", () => {
            this.clients.delete(id);
        });
    }
    sendNotification(userId, data) {
        const client = this.clients.get(userId);
        if (client) {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }
    broadcastNotification(data) {
        this.clients.forEach((client) => {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        });
    }
}
exports.SSEManager = SSEManager;
