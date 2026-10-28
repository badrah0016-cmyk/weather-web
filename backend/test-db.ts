import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaMariaDb({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "weather__db",
    connectionLimit: 5
});

const prisma = new PrismaClient({
    adapter
});

async function testDatabase() {
    try {
        const result = await prisma.$queryRaw`
            SELECT DATABASE() AS database_name
        `;

        console.log("MySQL + Prisma холболт амжилттай!");
        console.log("Database:", result);

    } catch (error) {
        console.error("Database connection error:");
        console.error(error);

    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();