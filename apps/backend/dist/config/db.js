"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDbConnection = testDbConnection;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Test the database connection
async function testDbConnection() {
    try {
        await prisma.$connect();
        console.log("Database connection successful!");
    }
    catch (error) {
        console.error("Failed to connect to the database:", error);
        process.exit(1); // Exit the process if the database connection fails
    }
}
// Test the connection before starting the server
testDbConnection();
exports.default = prisma;
