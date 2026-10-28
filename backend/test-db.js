import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaMariaDb({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "weather__db",
    connectionLimit: 5,
    allowPublicKeyRetrieval: true
});

const prisma = new PrismaClient({
    adapter
});

async function testDatabase() {
    try {
        await prisma.$connect();

        console.log("=================================");
        console.log("✅ MySQL + Prisma холболт амжилттай!");
        console.log("=================================");

        const result = await prisma.$queryRaw`
            SELECT DATABASE() AS database_name
        `;

        console.log("📦 Database:", result);

    } catch (aldaa) {
        console.error("");
        console.error("❌ Database connection error:");
        console.error(aldaa);

    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();