import "dotenv/config";
import axios from "axios";

import { retry } from "./utils/retry.js";

import {
    tsagAgaarSanuulgaLogger
} from "./utils/logger.js";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";


// =================================
// MYSQL + PRISMA
// =================================

const adapter = new PrismaMariaDb({

    host:
        process.env.DB_HOST ||
        "localhost",

    port:
        Number(
            process.env.DB_PORT ||
            3306
        ),

    user:
        process.env.DB_USER ||
        "root",

    password:
        process.env.DB_PASSWORD,

    database:
        process.env.DB_NAME ||
        "weather_db",

    connectionLimit: 5,

    allowPublicKeyRetrieval: true

});


const prisma =
    new PrismaClient({
        adapter
    });


// =================================
// WEATHER API
// =================================

const WEATHER_API_URL =
    process.env.WEATHER_API_URL;

const WEATHER_API_KEY =
    process.env.WEATHER_API_KEY;


// =================================
// ALERT API
// =================================

async function getAlerts() {

    const response =
        await retry(

            () =>
                axios.get(

                    `${WEATHER_API_URL}/weather/alerts`,

                    {
                        headers: {
                            "X-API-Key":
                                WEATHER_API_KEY
                        },

                        timeout: 30000
                    }

                ),

            3,

            2000,

            tsagAgaarSanuulgaLogger

        );


    return response.data;
}


// =================================
// ALERT SAVE
// =================================

async function saveAlerts() {

    const startTime =
        Date.now();


    // =================================
    // ТООЛУУР
    // =================================

    let totalAlerts = 0;

    let downloadedAlerts = 0;

    let newAlerts = 0;

    let updatedAlerts = 0;

    let errorAlerts = 0;

    let savedAlerts = 0;


    tsagAgaarSanuulgaLogger.info(
        ""
    );

    tsagAgaarSanuulgaLogger.info(
        "========================================"
    );

    tsagAgaarSanuulgaLogger.info(
        "⚠️ WEATHER ALERT IMPORT"
    );

    tsagAgaarSanuulgaLogger.info(
        "========================================"
    );


    try {

        // =================================
        // API-ААС ALERT АВАХ
        // =================================

        tsagAgaarSanuulgaLogger.info(
            "📡 Weather Alert API дуудаж байна..."
        );


        const apiResponse =
            await getAlerts();


        tsagAgaarSanuulgaLogger.info(
            "✅ API response амжилттай ирлээ"
        );


        // =================================
        // API DATA
        // =================================

        const alerts =
            Array.isArray(
                apiResponse?.data
            )
                ? apiResponse.data
                : [];


        totalAlerts =
            alerts.length;


        tsagAgaarSanuulgaLogger.info(
            `📊 Нийт API alert: ${totalAlerts}`
        );


        // =================================
        // API DATA БАЙХГҮЙ
        // =================================

        if (
            alerts.length === 0
        ) {

            tsagAgaarSanuulgaLogger.warn(
                "ℹ️ API дээр хадгалах alert байхгүй байна"
            );

        }


        // =================================
        // ALERT БҮР
        // =================================

        for (
            const alert
            of alerts
        ) {

            try {

                tsagAgaarSanuulgaLogger.info(
                    "----------------------------------------"
                );


                tsagAgaarSanuulgaLogger.info(
                    `⚠️ Alert ID: ${alert.id}`
                );


                tsagAgaarSanuulgaLogger.info(
                    `📢 Гарчиг: ${
                        alert.title ??
                        "Гарчиггүй"
                    }`
                );


                // =================================
                // API-ААС АМЖИЛТТАЙ ТАТСАН
                // =================================

                downloadedAlerts++;


                // =================================
                // AFFECTED AREAS
                // =================================

                const affectedAreas =
                    Array.isArray(
                        alert.affectedAreas
                    )

                        ? JSON.stringify(
                            alert.affectedAreas
                        )

                        : JSON.stringify(
                            []
                        );


                // =================================
                // START TIME
                // =================================

                const alertStartTime =
                    alert.startTime

                        ? new Date(
                            alert.startTime
                        )

                        : null;


                // =================================
                // END TIME
                // =================================

                const alertEndTime =
                    alert.endTime

                        ? new Date(
                            alert.endTime
                        )

                        : null;


                // =================================
                // ALERT DB-Д ӨМНӨ НЬ БАЙГАА ЭСЭХ
                // =================================

                const existingAlert =
                    await prisma.$queryRaw`

                        SELECT id

                        FROM tsag_agaar_sanuulga

                        WHERE id =
                            ${String(
                                alert.id
                            )}

                        LIMIT 1

                    `;


                const isExisting =
                    existingAlert.length > 0;


                // =================================
                // INSERT / UPDATE
                // =================================

                await prisma.$executeRaw`

                    INSERT INTO tsag_agaar_sanuulga (

                        id,

                        turul,

                        hundrel,

                        garchig,

                        tailbar,

                        nolooloh_bus,

                        ehleh_ognoo,

                        duusah_ognoo,

                        idevhtei

                    )

                    VALUES (

                        ${String(
                            alert.id
                        )},

                        ${alert.type ??
                            null},

                        ${alert.severity ??
                            null},

                        ${alert.title ??
                            null},

                        ${alert.description ??
                            null},

                        ${affectedAreas},

                        ${alertStartTime},

                        ${alertEndTime},

                        ${alert.isActive
                            ? 1
                            : 0}

                    )

                    ON DUPLICATE KEY UPDATE

                        turul =
                            VALUES(turul),

                        hundrel =
                            VALUES(hundrel),

                        garchig =
                            VALUES(garchig),

                        tailbar =
                            VALUES(tailbar),

                        nolooloh_bus =
                            VALUES(nolooloh_bus),

                        ehleh_ognoo =
                            VALUES(ehleh_ognoo),

                        duusah_ognoo =
                            VALUES(duusah_ognoo),

                        idevhtei =
                            VALUES(idevhtei),

                        hadgalsan_ognoo =
                            CURRENT_TIMESTAMP

                `;


                // =================================
                // INSERT / UPDATE ТООЛОХ
                // =================================

                if (
                    isExisting
                ) {

                    updatedAlerts++;


                    tsagAgaarSanuulgaLogger.info(
                        "🔄 Өмнөх alert шинэчлэгдлээ"
                    );

                } else {

                    newAlerts++;


                    tsagAgaarSanuulgaLogger.info(
                        "🆕 Шинэ alert DB-д нэмэгдлээ"
                    );

                }


                savedAlerts++;


                // =================================
                // НӨЛӨӨЛӨХ БҮС
                // =================================

                tsagAgaarSanuulgaLogger.info(
                    `📍 Нөлөөлөх бүс: ${
                        Array.isArray(
                            alert.affectedAreas
                        )

                            ? alert.affectedAreas.join(
                                ", "
                            )

                            : "Байхгүй"
                    }`
                );


                // =================================
                // SEVERITY
                // =================================

                tsagAgaarSanuulgaLogger.info(
                    `🚨 Severity: ${
                        alert.severity ||
                        "Тодорхойгүй"
                    }`
                );


                // =================================
                // ACTIVE
                // =================================

                tsagAgaarSanuulgaLogger.info(
                    `🔔 Идэвхтэй: ${
                        alert.isActive
                            ? "Тийм"
                            : "Үгүй"
                    }`
                );


            } catch (error) {

                errorAlerts++;


                tsagAgaarSanuulgaLogger.error(
                    `❌ Alert хадгалах алдаа: ${alert.id}`
                );


                tsagAgaarSanuulgaLogger.error(
                    error.stack ||
                    error.message
                );

            }

        }


        // =================================
        // АЖИЛЛАСАН ХУГАЦАА
        // =================================

        const endTime =
            Date.now();


        const duration =
            (
                (
                    endTime -
                    startTime
                ) /
                1000
            ).toFixed(2);


        // =================================
        // ҮР ДҮН
        // =================================

        tsagAgaarSanuulgaLogger.info(
            ""
        );

        tsagAgaarSanuulgaLogger.info(
            "========================================"
        );

        tsagAgaarSanuulgaLogger.info(
            "📊 WEATHER ALERT IMPORT ҮР ДҮН"
        );

        tsagAgaarSanuulgaLogger.info(
            "========================================"
        );


        tsagAgaarSanuulgaLogger.info(
            `📡 API-аас ирсэн alert        : ${totalAlerts}`
        );


        tsagAgaarSanuulgaLogger.info(
            `⬇️  Амжилттай татсан          : ${downloadedAlerts}`
        );


        tsagAgaarSanuulgaLogger.info(
            `🆕 Шинээр нэмсэн              : ${newAlerts}`
        );


        tsagAgaarSanuulgaLogger.info(
            `🔄 Шинэчилсэн                 : ${updatedAlerts}`
        );


        tsagAgaarSanuulgaLogger.info(
            `💾 DB-д хадгалсан/шинэчилсэн  : ${savedAlerts}`
        );


        tsagAgaarSanuulgaLogger.info(
            `❌ Алдаатай                   : ${errorAlerts}`
        );


        tsagAgaarSanuulgaLogger.info(
            `⏱️  Зарцуулсан хугацаа        : ${duration} секунд`
        );


        tsagAgaarSanuulgaLogger.info(
            "========================================"
        );


        if (
            errorAlerts === 0
        ) {

            tsagAgaarSanuulgaLogger.info(
                "🎉 ALERT IMPORT АМЖИЛТТАЙ ДУУСЛАА"
            );

        } else {

            tsagAgaarSanuulgaLogger.warn(
                "⚠️ ALERT IMPORT ДУУССАН. Зарим alert дээр алдаа гарлаа."
            );

        }


        tsagAgaarSanuulgaLogger.info(
            "========================================"
        );


    } catch (error) {

        tsagAgaarSanuulgaLogger.error(
            ""
        );

        tsagAgaarSanuulgaLogger.error(
            "========================================"
        );

        tsagAgaarSanuulgaLogger.error(
            "❌ ALERT API IMPORT АЛДАА"
        );

        tsagAgaarSanuulgaLogger.error(
            "========================================"
        );


        if (
            error.response
        ) {

            tsagAgaarSanuulgaLogger.error(
                `📡 HTTP Status: ${
                    error.response.status
                }`
            );


            tsagAgaarSanuulgaLogger.error(
                `📄 API Response: ${
                    JSON.stringify(
                        error.response.data
                    )
                }`
            );


        } else {

            tsagAgaarSanuulgaLogger.error(
                error.stack ||
                error.message
            );

        }

    } finally {

        await prisma.$disconnect();


        tsagAgaarSanuulgaLogger.info(
            "🔌 MySQL холболт хаагдлаа"
        );

    }
}


// =================================
// START
// =================================

saveAlerts();