import "dotenv/config";
import axios from "axios";

import prisma from "./prisma.js";

import { retry } from "./utils/retry.js";

import {
    uridchilsanMedeeLogger
} from "./utils/logger.js";


// ==========================================
// OPEN-METEO WEATHER CODE → МОНГОЛ НӨХЦӨЛ
// ==========================================

function getWeatherCondition(code) {

    const conditions = {

        0: "Цэлмэг",

        1: "Ихэнхдээ цэлмэг",

        2: "Бага зэрэг үүлтэй",

        3: "Үүлэрхэг",

        45: "Манантай",

        48: "Хяруу манантай",

        51: "Бага зэргийн шиврээ бороо",

        53: "Шиврээ бороо",

        55: "Их хэмжээний шиврээ бороо",

        56: "Бага зэргийн хүйтэн шиврээ",

        57: "Хүйтэн шиврээ",

        61: "Бага зэргийн бороо",

        63: "Бороо",

        65: "Ширүүн бороо",

        66: "Бага зэргийн хүйтэн бороо",

        67: "Ширүүн хүйтэн бороо",

        71: "Бага зэргийн цас",

        73: "Цас",

        75: "Ширүүн цас",

        77: "Цасан ширхэг",

        80: "Бага зэргийн аадар бороо",

        81: "Аадар бороо",

        82: "Ширүүн аадар бороо",

        85: "Бага зэргийн цасан аадар",

        86: "Ширүүн цасан аадар",

        95: "Аянга цахилгаантай",

        96: "Мөндөртэй аянга",

        99: "Ширүүн мөндөртэй аянга"

    };

    return conditions[code] || "Тодорхойгүй";
}


// ==========================================
// ГАРИГИЙН НЭР
// ==========================================

function getMongolianWeekday(dateString) {

    const date =
        new Date(`${dateString}T00:00:00`);

    const days = [

        "Ням",

        "Даваа",

        "Мягмар",

        "Лхагва",

        "Пүрэв",

        "Баасан",

        "Бямба"

    ];

    return days[date.getDay()];
}


// ==========================================
// NULL БОЛГОХ ТУСЛАХ ФУНКЦ
// ==========================================

function toNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


// ==========================================
// OPEN-METEO TIME → MYSQL TIME
// ==========================================
//
// Open-Meteo:
// 2026-10-06T06:48
//
// MySQL:
// 06:48:00
//
// timezone=Asia/Ulaanbaatar ашиглаж байгаа
// тул UTC хөрвүүлэлт хийхгүй.
// ==========================================

function toMysqlTime(value) {

    if (!value) {

        return null;

    }

    const valueString =
        String(value);

    if (valueString.length < 16) {

        return null;

    }

    return `${valueString.substring(
        11,
        16
    )}:00`;
}


// ==========================================
// OPEN-METEO API URL
// ==========================================

const OPEN_METEO_API_URL =
    process.env.OPEN_METEO_API_URL ||
    "https://api.open-meteo.com/v1/forecast";


// ==========================================
// 1 СТАНЦЫН 7 ХОНОГИЙН МЭДЭЭ
// ==========================================

async function saveForecastForStation(station) {

    const stationNumber =
        String(
            station.stantsDugaar
        );

    const latitude =
        toNumber(
            station.urgurug
        );

    const longitude =
        toNumber(
            station.urtrag
        );


    // ==========================================
    // COORDINATE ШАЛГАХ
    // ==========================================

    if (
        latitude === null ||
        longitude === null
    ) {

        uridchilsanMedeeLogger.warn(
            `⚠️ ${stationNumber} - координат байхгүй`
        );

        return {

            success: false,

            count: 0

        };

    }


    // ==========================================
    // OPEN-METEO API
    // ==========================================

    const response =

        await retry(

            async () => {

                return await axios.get(

                    OPEN_METEO_API_URL,

                    {

                        params: {

                            latitude,

                            longitude,

                            daily:
                                [
                                    "weather_code",

                                    "temperature_2m_min",

                                    "temperature_2m_max",

                                    "precipitation_probability_max",

                                    "precipitation_sum",

                                    "snowfall_sum",

                                    "wind_speed_10m_max",

                                    "wind_gusts_10m_max",

                                    "wind_direction_10m_dominant",

                                    "uv_index_max",

                                    "sunrise",

                                    "sunset"

                                ].join(","),

                            timezone:
                                "Asia/Ulaanbaatar",

                            forecast_days: 7,

                            temperature_unit:
                                "celsius",

                            wind_speed_unit:
                                "ms",

                            precipitation_unit:
                                "mm"

                        },

                        timeout: 15000

                    }

                );

            },

            3,

            2000,

            uridchilsanMedeeLogger

        );


    // ==========================================
    // DAILY DATA
    // ==========================================

    const daily =
        response.data?.daily;


    if (
        !daily ||
        !Array.isArray(
            daily.time
        )
    ) {

        throw new Error(
            "Open-Meteo daily data ирсэнгүй"
        );

    }


    // ==========================================
    // 7 ӨДРИЙН ОГНОО ШАЛГАХ
    // ==========================================

    if (
        daily.time.length === 0
    ) {

        throw new Error(
            "Open-Meteo 7 хоногийн огноо хоосон байна"
        );

    }


    // ==========================================
    // DAILY ARRAY-НУУДЫГ ШАЛГАХ
    // ==========================================

    const expectedLength =
        daily.time.length;

    const arraysToCheck = [

        "weather_code",

        "temperature_2m_min",

        "temperature_2m_max",

        "precipitation_probability_max",

        "precipitation_sum",

        "snowfall_sum",

        "wind_speed_10m_max",

        "wind_gusts_10m_max",

        "wind_direction_10m_dominant",

        "uv_index_max",

        "sunrise",

        "sunset"

    ];

    for (
        const field of arraysToCheck
    ) {

        if (
            daily[field] &&
            daily[field].length !==
                expectedLength
        ) {

            throw new Error(
                `Open-Meteo ${field} массивын хэмжээ буруу байна`
            );

        }

    }


    // ==========================================
    // ХАДГАЛСАН ТОО
    // ==========================================

    let savedCount = 0;


    // ==========================================
    // 7 ӨДӨР
    // ==========================================

    for (
        let i = 0;
        i < daily.time.length;
        i++
    ) {

        const date =
            daily.time[i];


        // ==========================================
        // WEATHER CODE
        // ==========================================

        const weatherCode =
            daily.weather_code?.[i];

        const condition =
            getWeatherCondition(
                weatherCode
            );


        // ==========================================
        // ГАРИГ
        // ==========================================

        const weekday =
            getMongolianWeekday(
                date
            );


        // ==========================================
        // TEMPERATURE
        // ==========================================

        const temperatureMin =
            toNumber(
                daily
                    .temperature_2m_min
                    ?.[i]
            );

        const temperatureMax =
            toNumber(
                daily
                    .temperature_2m_max
                    ?.[i]
            );


        // ==========================================
        // PRECIPITATION
        // ==========================================

        const precipitationProbability =
            toNumber(
                daily
                    .precipitation_probability_max
                    ?.[i]
            );

        const precipitation =
            toNumber(
                daily
                    .precipitation_sum
                    ?.[i]
            );


        // ==========================================
        // SNOW
        // ==========================================

        const snowfall =
            toNumber(
                daily
                    .snowfall_sum
                    ?.[i]
            );


        // ==========================================
        // WIND
        // ==========================================

        const windSpeed =
            toNumber(
                daily
                    .wind_speed_10m_max
                    ?.[i]
            );

        const windDirection =
            toNumber(
                daily
                    .wind_direction_10m_dominant
                    ?.[i]
            );

        const windGust =
            toNumber(
                daily
                    .wind_gusts_10m_max
                    ?.[i]
            );


        // ==========================================
        // UV INDEX
        // ==========================================

        const uvMax =
            toNumber(
                daily
                    .uv_index_max
                    ?.[i]
            );


        // ==========================================
        // SUNRISE
        // ==========================================

        const sunrise =
            toMysqlTime(
                daily.sunrise?.[i]
            );


        // ==========================================
        // SUNSET
        // ==========================================

        const sunset =
            toMysqlTime(
                daily.sunset?.[i]
            );


        // ==========================================
        // DATABASE SAVE
        // ==========================================

        await prisma.$executeRaw`

            INSERT INTO uridchilsan_medee (

                stants_dugaar,

                ognoo,

                garig,

                temperatur_min_c,

                temperatur_max_c,

                nohtsol,

                hur_tunadas_magadlal_huvi,

                hur_tunadas_mm,

                salhiny_hurd_ms,

                salhiny_chigleg_gradus,

                salhiny_delbee_max_ms,

                chigleg_huvi,

                tsas_cm,

                uv_max,

                nar_mandah,

                nar_jargah,

                eh_urvalj,

                hadgalsan_ognoo

            )

            VALUES (

                ${stationNumber},

                ${date},

                ${weekday},

                ${temperatureMin},

                ${temperatureMax},

                ${condition},

                ${precipitationProbability},

                ${precipitation},

                ${windSpeed},

                ${windDirection},

                ${windGust},

                NULL,

                ${snowfall},

                ${uvMax},

                ${sunrise},

                ${sunset},

                'open-meteo',

                NOW()

            )

            ON DUPLICATE KEY UPDATE

                garig =
                    VALUES(garig),

                temperatur_min_c =
                    VALUES(
                        temperatur_min_c
                    ),

                temperatur_max_c =
                    VALUES(
                        temperatur_max_c
                    ),

                nohtsol =
                    VALUES(nohtsol),

                hur_tunadas_magadlal_huvi =
                    VALUES(
                        hur_tunadas_magadlal_huvi
                    ),

                hur_tunadas_mm =
                    VALUES(
                        hur_tunadas_mm
                    ),

                salhiny_hurd_ms =
                    VALUES(
                        salhiny_hurd_ms
                    ),

                salhiny_chigleg_gradus =
                    VALUES(
                        salhiny_chigleg_gradus
                    ),

                salhiny_delbee_max_ms =
                    VALUES(
                        salhiny_delbee_max_ms
                    ),

                tsas_cm =
                    VALUES(tsas_cm),

                uv_max =
                    VALUES(uv_max),

                nar_mandah =
                    VALUES(nar_mandah),

                nar_jargah =
                    VALUES(nar_jargah),

                hadgalsan_ognoo =
                    NOW()

        `;


        savedCount++;

    }


    return {

        success: true,

        count: savedCount

    };

}


// ==========================================
// ҮНДСЭН IMPORT
// ==========================================

async function main() {

    const startTime =
        Date.now();


    // ==========================================
    // START LOG
    // ==========================================

    uridchilsanMedeeLogger.info("");

    uridchilsanMedeeLogger.info(
        "=============================================="
    );

    uridchilsanMedeeLogger.info(
        "🔮 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ IMPORT"
    );

    uridchilsanMedeeLogger.info(
        "=============================================="
    );

    uridchilsanMedeeLogger.info(
        `📡 Эх үүсвэр: Open-Meteo`
    );

    uridchilsanMedeeLogger.info(
        `🗄️ Database: ${
            process.env.DB_NAME ||
            "weather_db"
        }`
    );

    uridchilsanMedeeLogger.info(
        "📋 Table: uridchilsan_medee"
    );


    try {

        // ==========================================
        // OPEN-METEO URL ШАЛГАХ
        // ==========================================

        if (
            !process.env.OPEN_METEO_API_URL
        ) {

            throw new Error(
                "OPEN_METEO_API_URL .env дээр тохируулагдаагүй байна"
            );

        }


        // ==========================================
        // DATABASE CONNECTION ШАЛГАХ
        // ==========================================

        await prisma.$queryRaw`
            SELECT 1 AS connected
        `;

        uridchilsanMedeeLogger.info(
            "✅ Database connection амжилттай"
        );


        // ==========================================
        // DB-ЭЭС БҮХ СТАНЦ АВАХ
        // ==========================================

        const stations =
            await prisma.stantsuud.findMany({

                select: {

                    stantsDugaar: true,

                    ner: true,

                    aimag: true,

                    urgurug: true,

                    urtrag: true

                }

            });


        uridchilsanMedeeLogger.info(
            `📊 DB дээр ${stations.length} станц байна`
        );


        if (
            stations.length === 0
        ) {

            throw new Error(
                "DB дээр станцын мэдээлэл байхгүй байна"
            );

        }


        // ==========================================
        // COUNTERS
        // ==========================================

        let successCount = 0;

        let failedCount = 0;

        let totalSaved = 0;


        // ==========================================
        // БҮХ СТАНЦААР ДАВТАХ
        // ==========================================

        for (
            const station of stations
        ) {

            const stationNumber =
                String(
                    station.stantsDugaar
                );


            try {

                uridchilsanMedeeLogger.info(
                    `🌤️ ${stationNumber} - ${station.ner} - 7 хоногийн мэдээ авч байна...`
                );


                const result =
                    await saveForecastForStation(
                        station
                    );


                if (
                    result.success
                ) {

                    successCount++;

                    totalSaved +=
                        result.count;


                    uridchilsanMedeeLogger.info(
                        `✅ ${stationNumber} - ${result.count} өдрийн мэдээ хадгаллаа`
                    );

                } else {

                    failedCount++;


                    uridchilsanMedeeLogger.warn(
                        `⚠️ ${stationNumber} - мэдээ хадгалагдсангүй`
                    );

                }


            } catch (error) {

                failedCount++;


                uridchilsanMedeeLogger.error(
                    `❌ ${stationNumber} - ${station.ner} - алдаа`
                );


                uridchilsanMedeeLogger.error(
                    error.stack ||
                    error.message
                );

            }

        }


        // ==========================================
        // ДҮН
        // ==========================================

        const duration =
            (
                (
                    Date.now() -
                    startTime
                ) / 1000
            ).toFixed(2);


        uridchilsanMedeeLogger.info("");

        uridchilsanMedeeLogger.info(
            "=============================================="
        );

        uridchilsanMedeeLogger.info(
            "📊 IMPORT ДҮН"
        );

        uridchilsanMedeeLogger.info(
            "=============================================="
        );

        uridchilsanMedeeLogger.info(
            `🏢 Нийт станц: ${stations.length}`
        );

        uridchilsanMedeeLogger.info(
            `✅ Амжилттай станц: ${successCount}`
        );

        uridchilsanMedeeLogger.info(
            `❌ Амжилтгүй станц: ${failedCount}`
        );

        uridchilsanMedeeLogger.info(
            `💾 Хадгалсан мэдээ: ${totalSaved}`
        );

        uridchilsanMedeeLogger.info(
            `⏱️ Зарцуулсан хугацаа: ${duration} секунд`
        );

        uridchilsanMedeeLogger.info(
            "=============================================="
        );


    } catch (error) {

        uridchilsanMedeeLogger.error(
            "❌ 7 хоногийн мэдээ import хийхэд алдаа гарлаа"
        );

        uridchilsanMedeeLogger.error(
            error.stack ||
            error.message
        );

        process.exitCode = 1;

    } finally {

        await prisma.$disconnect();

    }

}


// ==========================================
// START
// ==========================================

main();