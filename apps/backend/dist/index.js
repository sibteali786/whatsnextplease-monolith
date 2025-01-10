"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseManager = void 0;
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./config/db"));
const cors_1 = __importDefault(require("cors"));
const SSEManager_1 = require("./utils/SSEManager");
const notification_routes_1 = require("./routes/notification.routes");
const app = (0, express_1.default)();
exports.sseManager = new SSEManager_1.SSEManager();
// middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Simple route to fetch users from the database
app.get("/users", async (req, res) => {
    try {
        const users = await db_1.default.user.findMany();
        res.json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// Routes
app.use("/notifications", notification_routes_1.notificationRoutes);
// Health check route
app.get("/ping", (req, res) => {
    res.json({ message: "pong asbdsajbdkad kas" });
});
// Start the server after DB connection test
const startServer = async () => {
    try {
        // Ensure DB is connected
        await db_1.default.$connect();
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
        process.on("SIGINT", () => shutdown("SIGINT")); // handles ctrl+c
        process.on("SIGTERM", () => shutdown("SIGTERM"));
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
