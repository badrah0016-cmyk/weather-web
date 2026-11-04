
import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "weather_db",

    // TiDB Cloud TLS холболт
    ssl: process.env.NODE_ENV === "production" ? true : undefined,

    connectionLimit: 5,
    acquireTimeout: 30000,
    connectTimeout: 15000
});

const prisma = new PrismaClient({
    adapter
});

export default prisma;
