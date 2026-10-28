import winston from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ==========================================
// FILE PATH
// ==========================================

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const logsDir =
    path.join(
        __dirname,
        "..",
        "logs"
    );


// ==========================================
// LOG FOLDER ҮҮСГЭХ
// ==========================================

if (!fs.existsSync(logsDir)) {

    fs.mkdirSync(
        logsDir,
        {
            recursive: true
        }
    );

}


// ==========================================
// LOG FORMAT
// ==========================================

const logFormat =
    winston.format.printf(
        ({
            level,
            message,
            timestamp,
            stack
        }) => {

            const logMessage =
                stack || message;

            return (
                `${timestamp} [${level.toUpperCase()}] ${logMessage}`
            );

        }
    );


// ==========================================
// LOGGER ҮҮСГЭХ FUNCTION
// ==========================================

function createLogger(name) {

    return winston.createLogger({

        level: "info",

        format:
            winston.format.combine(

                winston.format.timestamp({

                    format:
                        "YYYY-MM-DD HH:mm:ss"

                }),

                winston.format.errors({

                    stack: true

                }),

                logFormat

            ),

        transports: [

            // ==================================
            // БҮХ LOG
            // ==================================

            new winston.transports.File({

                filename:
                    path.join(
                        logsDir,
                        `${name}.log`
                    )

            }),


            // ==================================
            // ERROR LOG
            // ==================================

            new winston.transports.File({

                filename:
                    path.join(
                        logsDir,
                        `${name}-error.log`
                    ),

                level: "error"

            }),


            // ==================================
            // CONSOLE
            // ==================================

            new winston.transports.Console()

        ]

    });

}


// ==========================================
// ОДООГИЙН ЦАГ АГААР
// ==========================================

export const odoogiinTsagAgaarLogger =
    createLogger(
        "odoogiin-tsag-agaar"
    );


// ==========================================
// УРЬДЧИЛСАН МЭДЭЭ
// ==========================================

export const uridchilsanMedeeLogger =
    createLogger(
        "uridchilsan-medee"
    );


// ==========================================
// АГААРЫН ЧАНАР
// ==========================================

export const agaarChanarLogger =
    createLogger(
        "agaar-chanar"
    );


// ==========================================
// ГОЛ УСНЫ ГИДРОЛОГИ
// ==========================================

export const golUsHydrologyLogger =
    createLogger(
        "gol-us-hydrology"
    );


// ==========================================
// ЦАГ АГААРЫН САНУУЛГА
// ==========================================

export const tsagAgaarSanuulgaLogger =
    createLogger(
        "tsag-agaar-sanuulga"
    );


// ==========================================
// СТАНЦУУД
// ==========================================

export const stantsuudLogger =
    createLogger(
        "stantsuud"
    );


// ==========================================
// DEFAULT LOGGER
// ==========================================

export default odoogiinTsagAgaarLogger;

