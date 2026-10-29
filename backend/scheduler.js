
import { execFile } from "node:child_process";
import winston from "winston";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// =====================================================
// PATH
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// TIMEZONE
// =====================================================

const TIMEZONE = "Asia/Ulaanbaatar";

// Vercel дээр функцийн файл хадгалах системд бичихгүй.
const IS_VERCEL = process.env.VERCEL === "1";

// =====================================================
// LOGS FOLDER
// =====================================================

const logsDir = path.join(__dirname, "logs");

if (!IS_VERCEL) {
    try {
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    } catch (error) {
        console.error("Logs хавтас үүсгэхэд алдаа:", error.message);
    }
}

// =====================================================
// SCHEDULER LOGGER
// =====================================================

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        const logMessage = stack || message;
        return `${timestamp} [${level.toUpperCase()}] ${logMessage}`;
    })
);

const transports = [
    new winston.transports.Console()
];

// Зөвхөн локал орчинд файлд лог хадгална.
if (!IS_VERCEL) {
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, "scheduler.log")
        }),
        new winston.transports.File({
            filename: path.join(logsDir, "scheduler-error.log"),
            level: "error"
        })
    );
}

const schedulerLogger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports
});

// =====================================================
// CURRENT TIME
// =====================================================

export function getCurrentTime() {
    return new Date().toLocaleString("mn-MN", {
        timeZone: TIMEZONE,
        hour12: false
    });
}

// =====================================================
// RUN SCRIPT
// =====================================================

export function runScript(file, description) {
    return new Promise((resolve) => {
        const startTime = getCurrentTime();
        const filePath = path.join(__dirname, file);

        console.log("");
        console.log("==========================================");
        console.log(`⏰ Эхэлсэн цаг: ${startTime}`);
        console.log(`🚀 ${description} эхэллээ`);
        console.log(`📄 Script: ${file}`);
        console.log("==========================================");

        schedulerLogger.info(
            `🚀 ${description} эхэллээ | Script: ${file} | Эхэлсэн цаг: ${startTime}`
        );

        // Файл байгаа эсэхийг шалгах
        if (!fs.existsSync(filePath)) {
            const errorMessage = `Script файл олдсонгүй: ${filePath}`;

            console.error(`❌ ${errorMessage}`);
            schedulerLogger.error(errorMessage);

            resolve(false);
            return;
        }

        // Vercel дээр child process ажиллуулах нь хязгаарлалттай
        // тул scheduled script-ийг ажиллуулахгүй.
        if (IS_VERCEL) {
            const message =
                `Vercel орчинд scheduler script ажиллуулахыг алгаслаа: ${file}`;

            console.warn(`⚠️ ${message}`);
            schedulerLogger.warn(message);

            resolve(false);
            return;
        }

        execFile(
            process.execPath,
            [filePath],
            {
                cwd: __dirname,
                windowsHide: true,
                timeout: 10 * 60 * 1000
            },
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ ${description} алдаа`);
                    console.error(error.message);

                    schedulerLogger.error(
                        `❌ ${description} алдаа | Script: ${file} | ${error.message}`
                    );

                    if (stderr) {
                        schedulerLogger.error(
                            `STDERR:\n${stderr.trim()}`
                        );
                    }

                    resolve(false);
                    return;
                }

                if (stderr) {
                    console.warn(`⚠️ ${description} STDERR`);
                    console.warn(stderr);

                    schedulerLogger.warn(
                        `STDERR:\n${stderr.trim()}`
                    );
                }

                if (stdout) {
                    console.log(`📋 ${description} OUTPUT`);
                    console.log(stdout);

                    schedulerLogger.info(
                        `OUTPUT:\n${stdout.trim()}`
                    );
                }

                const endTime = getCurrentTime();

                console.log("==========================================");
                console.log(`✅ ${description} амжилттай дууслаа`);
                console.log(`⏰ Дууссан цаг: ${endTime}`);
                console.log("==========================================");

                schedulerLogger.info(
                    `✅ ${description} амжилттай дууслаа | Script: ${file} | Дууссан цаг: ${endTime}`
                );

                resolve(true);
            }
        );
    });
}

// =====================================================
// SCHEDULER START
// =====================================================

const serverStartTime = getCurrentTime();

schedulerLogger.info(
    `🟢 WEATHER SCHEDULER эхэллээ | Timezone: ${TIMEZONE} | Эхэлсэн цаг: ${serverStartTime}`
);
