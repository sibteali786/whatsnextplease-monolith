"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const db_1 = __importDefault(require("./config/db"));
const startServer = async () => {
    try {
        await db_1.default.$connect();
        const app = await (0, server_1.createServer)();
        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
        const shutdown = async (signal) => {
            console.log(`\n${signal} received. Closing server...`);
            server.close(async () => {
                await db_1.default.$disconnect();
                console.log("Database disconnected, Server Shutting down...");
                process.exit(0);
            });
        };
        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
