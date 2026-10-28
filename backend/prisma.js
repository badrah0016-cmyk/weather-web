import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || "localhost",

    port: Number(
        process.env.DB_PORT || 3306
    ),

    user: process.env.DB_USER || "root",

    password: process.env.DB_PASSWORD || "",

    database: process.env.DB_NAME || "weather_db",

    connectionLimit: 10,

    acquireTimeout: 30000,

    connectTimeout: 10000,

    allowPublicKeyRetrieval: true
});

const prisma = new PrismaClient({
    adapter
});

export default prisma;