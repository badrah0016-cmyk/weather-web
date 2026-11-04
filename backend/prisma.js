
import "dotenv/config";

import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

const caPath = "/etc/secrets/isrgrootx1.pem";

if (
    process.env.NODE_ENV === "production" &&
    !fs.existsSync(caPath)
) {
    throw new Error("TiDB TLS сертификат олдсонгүй: " + caPath);
}

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "weather_db",

    ssl: process.env.NODE_ENV === "production"
        ? {
            ca: fs.readFileSync(caPath, "utf8")
        }
        : undefined,

    connectionLimit: 10,
    acquireTimeout: 30000,
    connectTimeout: 10000
});

const prisma = new PrismaClient({
    adapter
});

export default prisma;
