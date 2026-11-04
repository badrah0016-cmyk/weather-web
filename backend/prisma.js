
import "dotenv/config";

import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

const caPath = "/etc/secrets/isrgrootx1.pem";

if (!fs.existsSync(caPath)) {
    throw new Error("TiDB TLS сертификат олдсонгүй: " + caPath);
}

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "weather_db",

    ssl: {
        ca: fs.readFileSync(caPath, "utf8")
    },

    connectionLimit: 10,
    acquireTimeout: 30000,
    connectTimeout: 10000
});

const prisma = new PrismaClient({
    adapter
});

export default prisma;
