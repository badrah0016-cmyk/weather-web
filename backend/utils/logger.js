
import winston from "winston";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vercel дээр файлын лог бичихгүй.
const IS_VERCEL = process.env.VERCEL === "1";

const logsDir = path.resolve(__dirname, "..", "logs");

// Зөвхөн локал орчинд logs хавтас үүсгэнэ.
if (!IS_VERCEL) {
    try {
        fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
        console.error("Logs хавтас үүсгэхэд алдаа:", error.message);
    }
}

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
    })
);

function createLogger(name) {
    const transports = [
        new winston.transports.Console()
    ];

    // Локал компьютер дээр файлд лог хадгална.
    if (!IS_VERCEL) {
        transports.push(
            new winston.transports.File({
                filename: path.join(logsDir, `${name}.log`)
            }),
            new winston.transports.File({
                filename: path.join(logsDir, `${name}-error.log`),
                level: "error"
            })
        );
    }

    return winston.createLogger({
        level: "info",
        format: logFormat,
        transports
    });
}

export const odoogiinTsagAgaarLogger =
    createLogger("odoogiin-tsag-agaar");

export const uridchilsanMedeeLogger =
    createLogger("uridchilsan-medee");

export const agaarChanarLogger =
    createLogger("agaar-chanar");

export const golUsHydrologyLogger =
    createLogger("gol-us-hydrology");

export const tsagAgaarSanuulgaLogger =
    createLogger("tsag-agaar-sanuulga");

export const stantsuudLogger =
    createLogger("stantsuud");

export default odoogiinTsagAgaarLogger;
