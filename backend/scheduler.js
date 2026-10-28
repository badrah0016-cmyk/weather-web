import { execFile } from "child_process";
import winston from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =====================================================
// PATH
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// TIMEZONE
// =====================================================

const TIMEZONE = "Asia/Ulaanbaatar";

// =====================================================
// LOGS FOLDER
// =====================================================

const logsDir = path.join(
    __dirname,
    "logs"
);

if (!fs.existsSync(logsDir)) {

    fs.mkdirSync(
        logsDir,
        {
            recursive: true
        }
    );

}

// =====================================================
// SCHEDULER LOGGER
// =====================================================

const schedulerLogger = winston.createLogger({

    level: "info",

    format: winston.format.combine(

        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss"
        }),

        winston.format.errors({
            stack: true
        }),

        winston.format.printf(
            ({
                level,
                message,
                timestamp,
                stack
            }) => {

                const logMessage =
                    stack || message;

                return `${timestamp} [${level.toUpperCase()}] ${logMessage}`;

            }
        )

    ),

    transports: [

        // =============================================
        // БҮХ SCHEDULER LOG
        // =============================================

        new winston.transports.File({
            filename: path.join(
                logsDir,
                "scheduler.log"
            )
        }),

        // =============================================
        // ЗӨВХӨН ERROR
        // =============================================

        new winston.transports.File({
            filename: path.join(
                logsDir,
                "scheduler-error.log"
            ),
            level: "error"
        }),

        // =============================================
        // CONSOLE
        // =============================================

        new winston.transports.Console()

    ]

});

// =====================================================
// CURRENT TIME
// =====================================================

export function getCurrentTime() {

    return new Date().toLocaleString(
        "mn-MN",
        {
            timeZone: TIMEZONE,
            hour12: false
        }
    );

}

// =====================================================
// RUN SCRIPT
// =====================================================

export function runScript(
    file,
    description
) {

    return new Promise(
        (resolve) => {

            const startTime =
                getCurrentTime();

            const filePath =
                path.join(
                    __dirname,
                    file
                );

            // =========================================
            // START MESSAGE
            // =========================================

            console.log("");

            console.log(
                "=========================================="
            );

            console.log(
                `⏰ Эхэлсэн цаг: ${startTime}`
            );

            console.log(
                `🚀 ${description} эхэллээ`
            );

            console.log(
                `📄 Script: ${file}`
            );

            console.log(
                "=========================================="
            );

            schedulerLogger.info(
                `🚀 ${description} эхэллээ | Script: ${file} | Эхэлсэн цаг: ${startTime}`
            );

            // =========================================
            // FILE EXISTS CHECK
            // =========================================

            if (!fs.existsSync(filePath)) {

                const errorMessage =
                    `Script файл олдсонгүй: ${filePath}`;

                console.error("");

                console.error(
                    `❌ ${errorMessage}`
                );

                schedulerLogger.error(
                    `❌ ${errorMessage}`
                );

                resolve(false);

                return;
            }

            // =========================================
            // EXECUTE NODE SCRIPT
            // =========================================

            execFile(

                process.execPath,

                [filePath],

                {
                    cwd: __dirname,
                    windowsHide: true
                },

                (
                    error,
                    stdout,
                    stderr
                ) => {

                    // =================================
                    // ERROR
                    // =================================

                    if (error) {

                        console.error("");

                        console.error(
                            `❌ ${description} алдаа`
                        );

                        console.error(
                            error.message
                        );

                        schedulerLogger.error(
                            `❌ ${description} алдаа | Script: ${file} | ${error.message}`
                        );

                        if (stderr) {

                            schedulerLogger.error(
                                `📄 STDERR:\n${stderr.trim()}`
                            );

                        }

                        resolve(false);

                        return;
                    }

                    // =================================
                    // STDERR
                    // =================================

                    if (stderr) {

                        console.warn("");

                        console.warn(
                            `⚠️ ${description} STDERR`
                        );

                        console.warn(
                            stderr
                        );

                        schedulerLogger.warn(
                            `⚠️ ${description} STDERR:\n${stderr.trim()}`
                        );

                    }

                    // =================================
                    // STDOUT
                    // =================================

                    if (stdout) {

                        console.log("");

                        console.log(
                            `📋 ${description} OUTPUT`
                        );

                        console.log(
                            stdout
                        );

                        schedulerLogger.info(
                            `📋 ${description} OUTPUT:\n${stdout.trim()}`
                        );

                    }

                    // =================================
                    // SUCCESS
                    // =================================

                    const endTime =
                        getCurrentTime();

                    console.log("");

                    console.log(
                        "=========================================="
                    );

                    console.log(
                        `✅ ${description} амжилттай дууслаа`
                    );

                    console.log(
                        `⏰ Дууссан цаг: ${endTime}`
                    );

                    console.log(
                        "=========================================="
                    );

                    schedulerLogger.info(
                        `✅ ${description} амжилттай дууслаа | Script: ${file} | Дууссан цаг: ${endTime}`
                    );

                    resolve(true);

                }

            );

        }
    );

}

// =====================================================
// SCHEDULER START
// =====================================================

const serverStartTime =
    getCurrentTime();

schedulerLogger.info(
    `🟢 WEATHER SCHEDULER эхэллээ | Timezone: ${TIMEZONE} | Эхэлсэн цаг: ${serverStartTime}`
);