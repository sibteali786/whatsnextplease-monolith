import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test the database connection
// export async function testDbConnection() {
//   try {
//     await prisma.$connect();
//     console.log("Database connection successful!");
//   } catch (error) {
//     console.error("Failed to connect to the database:", error);
//     process.exit(1); // Exit the process if the database connection fails
//   }
// }

// Test the connection before starting the server
// testDbConnection();
export default prisma;
