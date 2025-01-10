"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const notification_routes_1 = require("./routes/notification.routes");
async function createServer() {
    const app = (0, express_1.default)();
    // middlewares
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Routes
    app.use("/notifications", notification_routes_1.notificationRoutes);
    // Health check route
    app.get("/ping", (req, res) => {
        res.json({ message: "pong" });
    });
    return app;
}
