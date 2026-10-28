import "dotenv/config";
import axios from "axios";

import prisma from "./prisma.js";

import { retry } from "./utils/retry.js";

import {
    golUsHydrologyLogger
} from "./utils/logger.js";


// ==================================================
// WEATHER API
// ==================================================

const WEATHER_API_URL =
    process.env.WEATHER_API_URL;

const WEATHER_API_KEY =
    process.env.WEATHER_API_KEY;


// ==================================================
// API ТОХИРГОО ШАЛГАХ
// ==================================================

if (!WEATHER_API_URL) {

    golUsHydrologyLogger.error(
        "❌ WEATHER_API_URL .env файлд байхгүй байна"
    );

    process.exit(1);
}


if (!WEATHER_API_KEY) {

    golUsHydrologyLogger.error(
        "❌ WEATHER_API_KEY .env файлд байхгүй байна"
    );

    process.exit(1);
}


// ==================================================
// ТООН УТГА БОЛГОХ
// ==================================================

function toNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return null;
    }

    return number;
}


// ==================================================
// TEXT УТГА БОЛГОХ
// ==================================================

function toText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }

    if (
        typeof value === "string"
    ) {

        const text =
            value.trim();

        return text === ""
            ? null
            : text;
    }

    return String(value);
}


// ==================================================
// ОЛОН FIELD-ЭЭС УТГА АВАХ
// ==================================================

function getFirstValue(
    object,
    fields
) {

    for (
        const field of fields
    ) {

        const value =
            object?.[field];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            return value;
        }
    }

    return null;
}


// ==================================================
// API RESPONSE-ЭЭС DATA АВАХ
// ==================================================

function getHydrologyData(
    apiResponse
) {

    // ----------------------------------------------
    // Шууд array
    // ----------------------------------------------

    if (
        Array.isArray(apiResponse)
    ) {

        return apiResponse;
    }


    // ----------------------------------------------
    // data array
    // ----------------------------------------------

    if (
        Array.isArray(
            apiResponse?.data
        )
    ) {

        return apiResponse.data;
    }


    // ----------------------------------------------
    // data.data array
    // ----------------------------------------------

    if (
        Array.isArray(
            apiResponse?.data?.data
        )
    ) {

        return apiResponse.data.data;
    }


    // ----------------------------------------------
    // result array
    // ----------------------------------------------

    if (
        Array.isArray(
            apiResponse?.result
        )
    ) {

        return apiResponse.result;
    }


    // ----------------------------------------------
    // items array
    // ----------------------------------------------

    if (
        Array.isArray(
            apiResponse?.items
        )
    ) {

        return apiResponse.items;
    }


    // ----------------------------------------------
    // results array
    // ----------------------------------------------

    if (
        Array.isArray(
            apiResponse?.results
        )
    ) {

        return apiResponse.results;
    }


    return [];
}


// ==================================================
// ГОЛ УСНЫ API
// ==================================================

async function getGolUs() {

    golUsHydrologyLogger.info(
        "📡 Hydrology API хүсэлт илгээж байна..."
    );

    const response =
        await retry(

            async () => {

                return await axios.get(

                    `${WEATHER_API_URL}/weather/hydrology`,

                    {
                        headers: {

                            "X-API-Key":
                                WEATHER_API_KEY,

                            "Accept":
                                "application/json"

                        },

                        timeout: 30000

                    }

                );

            },

            3,

            2000,

            golUsHydrologyLogger

        );


    golUsHydrologyLogger.info(
        `✅ Hydrology API HTTP status: ${response.status}`
    );


    return response.data;
}


// ==================================================
// ГОЛ УСНЫ МЭДЭЭЛЭЛ ХАДГАЛАХ
// ==================================================

async function saveGolUs() {

    const ehelsenTsag =
        Date.now();


    golUsHydrologyLogger.info("");

    golUsHydrologyLogger.info(
        "=========================================="
    );

    golUsHydrologyLogger.info(
        "🌊 ГОЛ УСНЫ МЭДЭЭЛЭЛ IMPORT"
    );

    golUsHydrologyLogger.info(
        "=========================================="
    );

    golUsHydrologyLogger.info(
        `📡 Эх үүсвэр: ${WEATHER_API_URL}`
    );

    golUsHydrologyLogger.info(
        `🗄️ Database: ${
            process.env.DB_NAME ||
            "weather_db"
        }`
    );

    golUsHydrologyLogger.info(
        "📋 Table: gol_us_hydrology"
    );


    try {

        // ==================================================
        // 1. DATABASE CONNECTION ШАЛГАХ
        // ==================================================

        await prisma.$queryRaw`
            SELECT 1 AS connected
        `;

        golUsHydrologyLogger.info(
            "✅ Database connection амжилттай"
        );


        // ==================================================
        // 2. API-ААС МЭДЭЭЛЭЛ АВАХ
        // ==================================================

        const apiResponse =
            await getGolUs();


        // ==================================================
        // 3. API RESPONSE ШАЛГАХ
        // ==================================================

        if (
            apiResponse === null ||
            apiResponse === undefined
        ) {

            throw new Error(
                "Hydrology API хоосон response буцаалаа"
            );
        }


        golUsHydrologyLogger.info(
            `📦 API response type: ${
                Array.isArray(apiResponse)
                    ? "array"
                    : typeof apiResponse
            }`
        );


        // ==================================================
        // API SUCCESS FALSE
        // ==================================================

        if (
            apiResponse?.success === false
        ) {

            throw new Error(
                `Hydrology API success=false: ${
                    apiResponse?.message ||
                    "Тодорхой message байхгүй"
                }`
            );
        }


        // ==================================================
        // 4. DATA АВАХ
        // ==================================================

        const golUs =
            getHydrologyData(
                apiResponse
            );


        golUsHydrologyLogger.info(
            `📊 API-аас ${golUs.length} гол, усны мэдээлэл илэрлээ`
        );


        // ==================================================
        // API DATA БАЙХГҮЙ
        // ==================================================

        if (
            golUs.length === 0
        ) {

            golUsHydrologyLogger.warn(
                "⚠️ API-аас хадгалах гол усны мэдээлэл олдсонгүй"
            );


            golUsHydrologyLogger.warn(
                `📄 API response: ${
                    JSON.stringify(
                        apiResponse
                    ).slice(
                        0,
                        5000
                    )
                }`
            );


            return;
        }


        // ==================================================
        // COUNTERS
        // ==================================================

        let downloadedCount = 0;

        let newCount = 0;

        let updatedCount = 0;

        let savedCount = 0;

        let errorCount = 0;


        // ==================================================
        // 5. ГОЛ БҮРЭЭР ДАВТАХ
        // ==================================================

        for (
            const gol of golUs
        ) {

            try {

                // ==================================================
                // ID
                // ==================================================

                const rawId =
                    getFirstValue(
                        gol,
                        [

                            "id",

                            "stationId",

                            "station_id",

                            "code",

                            "riverId",

                            "river_id"

                        ]
                    );


                if (
                    rawId === null
                ) {

                    errorCount++;


                    golUsHydrologyLogger.error(
                        `❌ ID байхгүй тул хадгалсангүй: ${
                            JSON.stringify(
                                gol
                            )
                        }`
                    );


                    continue;
                }


                const golId =
                    String(
                        rawId
                    );


                // ==================================================
                // НЭР
                // ==================================================

                const rawName =
                    getFirstValue(
                        gol,
                        [

                            "name",

                            "ner",

                            "riverName",

                            "river_name",

                            "stationName",

                            "station_name"

                        ]
                    );


                const golNer =
                    toText(
                        rawName
                    ) ||
                    "Нэргүй";


                downloadedCount++;


                golUsHydrologyLogger.info("");

                golUsHydrologyLogger.info(
                    "------------------------------------------"
                );

                golUsHydrologyLogger.info(
                    `🌊 ${golId} - ${golNer}`
                );


                // ==================================================
                // УСНЫ ТҮВШИН
                // ==================================================

                const usnyTuvshin =
                    toNumber(
                        getFirstValue(
                            gol,
                            [

                                "waterLevel",

                                "water_level",

                                "usnyTuvshin",

                                "usny_tuvshin",

                                "level"

                            ]
                        )
                    );


                // ==================================================
                // ХЭВИЙН ТҮВШИН
                // ==================================================

                const heviinTuvshin =
                    toNumber(
                        getFirstValue(
                            gol,
                            [

                                "normalLevel",

                                "normal_level",

                                "heviinTuvshin",

                                "heviin_tuvshin"

                            ]
                        )
                    );


                // ==================================================
                // ҮЕРИЙН БОСГО
                // ==================================================

                const ueriinBosgo =
                    toNumber(
                        getFirstValue(
                            gol,
                            [

                                "floodThreshold",

                                "flood_threshold",

                                "ueriinBosgo",

                                "ueriin_bosgo"

                            ]
                        )
                    );


                // ==================================================
                // УРСГАЛЫН ХУРД
                // ==================================================

                const ursgalHurd =
                    toNumber(
                        getFirstValue(
                            gol,
                            [

                                "flowRate",

                                "flow_rate",

                                "ursgalHurd",

                                "ursgal_hurd",

                                "discharge"

                            ]
                        )
                    );


                // ==================================================
                // УСНЫ ТЕМПЕРАТУР
                // ==================================================

                const usnyTemp =
                    toNumber(
                        getFirstValue(
                            gol,
                            [

                                "waterTemp",

                                "water_temp",

                                "waterTemperature",

                                "water_temperature",

                                "usnyTemp",

                                "usny_temp_c"

                            ]
                        )
                    );


                // ==================================================
                // ТӨЛӨВ
                // ==================================================

                const tuluv =
                    toText(
                        getFirstValue(
                            gol,
                            [

                                "status",

                                "tuluv",

                                "state"

                            ]
                        )
                    );


                // ==================================================
                // ХАНДЛАГА
                // ==================================================

                const handlaga =
                    toText(
                        getFirstValue(
                            gol,
                            [

                                "trend",

                                "handlaga",

                                "direction"

                            ]
                        )
                    );


                // ==================================================
                // LOG
                // ==================================================

                golUsHydrologyLogger.info(
                    `📏 Усны түвшин     : ${
                        usnyTuvshin ?? "-"
                    }`
                );

                golUsHydrologyLogger.info(
                    `📏 Хэвийн түвшин   : ${
                        heviinTuvshin ?? "-"
                    }`
                );

                golUsHydrologyLogger.info(
                    `⚠️ Үерийн босго    : ${
                        ueriinBosgo ?? "-"
                    }`
                );

                golUsHydrologyLogger.info(
                    `🌊 Урсац           : ${
                        ursgalHurd ?? "-"
                    }`
                );

                golUsHydrologyLogger.info(
                    `🌡️ Усны температур : ${
                        usnyTemp ?? "-"
                    } °C`
                );

                golUsHydrologyLogger.info(
                    `📈 Төлөв            : ${
                        tuluv ?? "-"
                    }`
                );

                golUsHydrologyLogger.info(
                    `📊 Хандлага         : ${
                        handlaga ?? "-"
                    }`
                );


                // ==================================================
                // 6. ӨМНӨ НЬ БАЙГАА ЭСЭХ
                // ==================================================

                const existingGol =
                    await prisma.$queryRaw`

                        SELECT id

                        FROM gol_us_hydrology

                        WHERE id = ${golId}

                        LIMIT 1

                    `;


                const isExisting =
                    Array.isArray(
                        existingGol
                    ) &&
                    existingGol.length > 0;


                // ==================================================
                // 7. INSERT / UPDATE
                // ==================================================

                await prisma.$executeRaw`

                    INSERT INTO gol_us_hydrology (

                        id,

                        ner,

                        usny_tuvshin,

                        heviin_tuvshin,

                        ueriin_bosgo,

                        ursgal_hurd,

                        usny_temp_c,

                        tuluv,

                        handlaga,

                        shinechilsen_ognoo

                    )

                    VALUES (

                        ${golId},

                        ${golNer},

                        ${usnyTuvshin},

                        ${heviinTuvshin},

                        ${ueriinBosgo},

                        ${ursgalHurd},

                        ${usnyTemp},

                        ${tuluv},

                        ${handlaga},

                        CURRENT_TIMESTAMP

                    )

                    ON DUPLICATE KEY UPDATE

                        ner = ${golNer},

                        usny_tuvshin =
                            ${usnyTuvshin},

                        heviin_tuvshin =
                            ${heviinTuvshin},

                        ueriin_bosgo =
                            ${ueriinBosgo},

                        ursgal_hurd =
                            ${ursgalHurd},

                        usny_temp_c =
                            ${usnyTemp},

                        tuluv =
                            ${tuluv},

                        handlaga =
                            ${handlaga},

                        shinechilsen_ognoo =
                            CURRENT_TIMESTAMP

                `;


                // ==================================================
                // 8. ТООЛУУР
                // ==================================================

                if (
                    isExisting
                ) {

                    updatedCount++;


                    golUsHydrologyLogger.info(
                        "🔄 Өмнөх мэдээлэл шинэчлэгдлээ"
                    );

                } else {

                    newCount++;


                    golUsHydrologyLogger.info(
                        "🆕 Шинэ гол усны мэдээлэл нэмэгдлээ"
                    );

                }


                savedCount++;


                golUsHydrologyLogger.info(
                    "💾 DB-д амжилттай хадгаллаа"
                );


            } catch (error) {

                errorCount++;


                golUsHydrologyLogger.error(
                    `❌ ${
                        gol?.id ??
                        gol?.stationId ??
                        gol?.station_id ??
                        "-"
                    } - ${
                        gol?.name ??
                        gol?.ner ??
                        gol?.riverName ??
                        "Нэргүй"
                    } хадгалах үед алдаа`
                );


                golUsHydrologyLogger.error(
                    `💥 Error: ${
                        error.message
                    }`
                );


                if (
                    error.code
                ) {

                    golUsHydrologyLogger.error(
                        `🔢 Error code: ${
                            error.code
                        }`
                    );

                }


                if (
                    error.stack
                ) {

                    golUsHydrologyLogger.error(
                        error.stack
                    );

                }

            }

        }


        // ==================================================
        // 9. ХУГАЦАА
        // ==================================================

        const duussanTsag =
            Date.now();


        const zartsuulsanHugatsaa =
            (
                (
                    duussanTsag -
                    ehelsenTsag
                ) / 1000
            ).toFixed(2);


        // ==================================================
        // 10. SUCCESS RATE
        // ==================================================

        const successRate =
            golUs.length > 0

                ? (
                    savedCount /
                    golUs.length *
                    100
                ).toFixed(1)

                : "0.0";


        // ==================================================
        // 11. ҮР ДҮН
        // ==================================================

        golUsHydrologyLogger.info("");

        golUsHydrologyLogger.info(
            "=========================================="
        );

        golUsHydrologyLogger.info(
            "📊 ГОЛ УСНЫ IMPORT ҮР ДҮН"
        );

        golUsHydrologyLogger.info(
            "=========================================="
        );

        golUsHydrologyLogger.info(
            `📡 API-аас ирсэн       : ${golUs.length}`
        );

        golUsHydrologyLogger.info(
            `⬇️ Уншсан              : ${downloadedCount}`
        );

        golUsHydrologyLogger.info(
            `🆕 Шинээр нэмсэн       : ${newCount}`
        );

        golUsHydrologyLogger.info(
            `🔄 Шинэчилсэн          : ${updatedCount}`
        );

        golUsHydrologyLogger.info(
            `💾 DB-д хадгалсан      : ${savedCount}`
        );

        golUsHydrologyLogger.info(
            `❌ Алдаатай            : ${errorCount}`
        );

        golUsHydrologyLogger.info(
            `📈 Амжилтын хувь       : ${successRate}%`
        );

        golUsHydrologyLogger.info(
            `⏱️ Зарцуулсан хугацаа  : ${zartsuulsanHugatsaa} секунд`
        );

        golUsHydrologyLogger.info(
            "=========================================="
        );


        // ==================================================
        // 12. STATUS
        // ==================================================

        if (
            errorCount === 0 &&
            savedCount === golUs.length
        ) {

            golUsHydrologyLogger.info(
                "🎉 БҮХ ГОЛ УСНЫ МЭДЭЭЛЭЛ АМЖИЛТТАЙ ХАДГАЛАГДЛАА"
            );

        } else if (
            savedCount > 0
        ) {

            golUsHydrologyLogger.warn(
                "⚠️ ГОЛ УСНЫ IMPORT ХЭСЭГЧЛЭН АМЖИЛТТАЙ"
            );

        } else {

            golUsHydrologyLogger.error(
                "❌ ГОЛ УСНЫ МЭДЭЭЛЭЛ ХАДГАЛАГДСАНГҮЙ"
            );

            throw new Error(
                "Hydrology-ийн нэг ч мэдээлэл DB-д хадгалагдсангүй"
            );

        }


    } catch (error) {

        // ==================================================
        // SYSTEM ERROR
        // ==================================================

        golUsHydrologyLogger.error("");

        golUsHydrologyLogger.error(
            "=========================================="
        );

        golUsHydrologyLogger.error(
            "❌ ГОЛ УСНЫ IMPORT SYSTEM ERROR"
        );

        golUsHydrologyLogger.error(
            "=========================================="
        );


        golUsHydrologyLogger.error(
            `💥 ${error.message}`
        );


        if (
            error.response
        ) {

            golUsHydrologyLogger.error(
                `📡 HTTP Status: ${
                    error.response.status
                }`
            );


            golUsHydrologyLogger.error(
                `📄 API Data: ${
                    JSON.stringify(
                        error.response.data
                    )
                }`
            );

        }


        if (
            error.stack
        ) {

            golUsHydrologyLogger.error(
                error.stack
            );

        }


        // Cron-д ERROR гэж мэдэгдүүлэх
        throw error;

    } finally {

        // ==================================================
        // PRISMA DISCONNECT
        // ==================================================

        try {

            await prisma.$disconnect();

            golUsHydrologyLogger.info(
                "🔌 MySQL холболт хаагдлаа"
            );

        } catch (disconnectError) {

            golUsHydrologyLogger.error(
                `❌ MySQL disconnect алдаа: ${
                    disconnectError.message
                }`
            );

        }

    }

}


// ==================================================
// START
// ==================================================

saveGolUs()

    .then(() => {

        golUsHydrologyLogger.info(
            "🏁 Гол усны import process дууслаа"
        );

    })

    .catch((error) => {

        golUsHydrologyLogger.error(
            `🚨 Гол усны import process ERROR: ${
                error.message
            }`
        );

        process.exitCode = 1;

    });