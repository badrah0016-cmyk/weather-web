
import "dotenv/config";
import axios from "axios";
import retry from "async-retry";

import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// =====================================================
// DATABASE
// =====================================================

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "weather_db",
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

// =====================================================
// OPEN-METEO SETTINGS
// =====================================================

const OPEN_METEO_URL =
    "https://api.open-meteo.com/v1/forecast";

const TIMEZONE = "Asia/Ulaanbaatar";
const FORECAST_HOURS = 48;
const SOURCE = "open-meteo";
const WEATHER_TYPE = "URIDCHILSAN";

// =====================================================
// MONGOLIA TIME
// =====================================================

function getMongoliaDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const get = (type) =>
        parts.find((part) => part.type === type)?.value ?? "00";

    return {
        year: Number(get("year")),
        month: Number(get("month")),
        day: Number(get("day")),
        hour: Number(get("hour")),
        minute: Number(get("minute")),
        second: Number(get("second")),
    };
}

function pad(value) {
    return String(value).padStart(2, "0");
}

// DATETIME мөр үүсгэнэ.
// Энд Date-ийн UTC хэсгийг Монголын орон нутгийн цагийн
// календарь болгон ашиглаж, цагийн бүсийг дахин нэмэхгүй.
function formatCalendarDateTime(date) {
    return (
        `${date.getUTCFullYear()}-` +
        `${pad(date.getUTCMonth() + 1)}-` +
        `${pad(date.getUTCDate())} ` +
        `${pad(date.getUTCHours())}:` +
        `${pad(date.getUTCMinutes())}:` +
        `${pad(date.getUTCSeconds())}`
    );
}

// Монголын одоогийн бүтэн цаг + дараагийн 48 цаг.
function getMongoliaHourRange() {
    const p = getMongoliaDateParts();

    // Монголын орон нутгийн цагийг календарийн утга
    // хэлбэрээр тооцоолно.
    const startDate = new Date(
        Date.UTC(
            p.year,
            p.month - 1,
            p.day,
            p.hour,
            0,
            0
        )
    );

    const endDate = new Date(
        startDate.getTime() +
        FORECAST_HOURS * 60 * 60 * 1000
    );

    return {
        start: formatCalendarDateTime(startDate),
        end: formatCalendarDateTime(endDate),
    };
}

// =====================================================
// WEATHER CONDITION
// =====================================================

function getWeatherCondition(code) {
    if (code == null) return "Тодорхойгүй";

    if (code === 0) return "Цэлмэг";
    if (code === 1) return "Бага зэрэг үүлтэй";
    if (code === 2) return "Үүлэрхэг";
    if (code === 3) return "Бүрхэг";

    if (code === 45 || code === 48) {
        return "Манантай";
    }

    if (code >= 51 && code <= 57) {
        return "Шиврээ бороо";
    }

    if (code >= 61 && code <= 67) {
        return "Бороо";
    }

    if (code >= 71 && code <= 77) {
        return "Цас";
    }

    if (code >= 80 && code <= 82) {
        return "Аадар бороо";
    }

    if (code === 85 || code === 86) {
        return "Цасан аадар";
    }

    if (code >= 95 && code <= 99) {
        return "Аянгатай аадар";
    }

    return "Тодорхойгүй";
}

// =====================================================
// WIND DIRECTION
// =====================================================

function getWindDirection(degree) {
    if (
        degree == null ||
        !Number.isFinite(Number(degree))
    ) {
        return null;
    }

    const directions = [
        "Х",
        "ХЗ",
        "З",
        "ӨЗ",
        "Ө",
        "ӨӨ",
        "Б",
        "ХБ",
    ];

    const index =
        Math.round(Number(degree) / 45) % 8;

    return directions[index];
}

// =====================================================
// FETCH OPEN-METEO HOURLY DATA
// =====================================================

async function getHourlyWeather(latitude, longitude) {
    return retry(
        async () => {
            const response = await axios.get(
                OPEN_METEO_URL,
                {
                    params: {
                        latitude,
                        longitude,

                        hourly: [
                            "temperature_2m",
                            "apparent_temperature",
                            "relative_humidity_2m",
                            "pressure_msl",
                            "wind_speed_10m",
                            "wind_direction_10m",
                            "wind_gusts_10m",
                            "precipitation",
                            "precipitation_probability",
                            "snowfall",
                            "weather_code",
                            "visibility",
                            "cloud_cover",
                            "uv_index",
                            "dew_point_2m",
                        ].join(","),

                        temperature_unit: "celsius",
                        wind_speed_unit: "ms",
                        precipitation_unit: "mm",

                        timezone: TIMEZONE,
                        forecast_days: 3,
                    },

                    timeout: 30000,
                }
            );

            return response.data;
        },
        {
            retries: 3,

            onRetry(error, attempt) {
                console.log(
                    `🔄 Дахин оролдож байна: ${attempt}/3`
                );
                console.log(error.message);
            },
        }
    );
}

// =====================================================
// SAVE ONE STATION
// =====================================================

async function saveStationWeather(station) {
    const {
        stantsDugaar,
        ner,
        urgurug,
        urtrag,
    } = station;

    console.log("");
    console.log("----------------------------------------");
    console.log(`📍 ${stantsDugaar} - ${ner}`);
    console.log("----------------------------------------");

    if (
        urgurug == null ||
        urtrag == null ||
        !Number.isFinite(Number(urgurug)) ||
        !Number.isFinite(Number(urtrag))
    ) {
        console.log("⚠️ Координат буруу. Алгаслаа.");
        return {
            received: 0,
            processed: 0,
            failed: 0,
        };
    }

    const { start, end } = getMongoliaHourRange();

    console.log(`🕐 Эхлэх: ${start}`);
    console.log(`🕐 Дуусах: ${end}`);

    // API-аас цагийн мэдээ татах.
    const data = await getHourlyWeather(
        Number(urgurug),
        Number(urtrag)
    );

    if (!data?.hourly?.time) {
        throw new Error(
            "Open-Meteo цагийн мэдээлэл буцаасангүй."
        );
    }

    const hourly = data.hourly;
    const times = hourly.time;

    console.log(
        `📥 API-аас ${times.length} цагийн мөр ирлээ`
    );

    let processed = 0;
    let failed = 0;

    // Нэг станцын бүх цагийн мэдээллийг дарааллаар хадгална.
    for (let i = 0; i < times.length; i++) {
        const tsag =
            String(times[i]).replace("T", " ") +
            (String(times[i]).length === 16 ? ":00" : "");

        // Зөвхөн одоогийн бүтэн цагаас эхэлсэн
        // дараагийн 48 цагийн хүрээг хадгална.
        if (tsag < start || tsag >= end) {
            continue;
        }

        const temperature =
            hourly.temperature_2m?.[i] ?? null;

        const feelsLike =
            hourly.apparent_temperature?.[i] ?? null;

        const humidity =
            hourly.relative_humidity_2m?.[i] ?? null;

        const pressure =
            hourly.pressure_msl?.[i] ?? null;

        const windSpeed =
            hourly.wind_speed_10m?.[i] ?? null;

        const windDegree =
            hourly.wind_direction_10m?.[i] ?? null;

        const windGust =
            hourly.wind_gusts_10m?.[i] ?? null;

        const precipitation =
            hourly.precipitation?.[i] ?? null;

        const precipitationProbability =
            hourly.precipitation_probability?.[i] ?? null;

        const snowfall =
            hourly.snowfall?.[i] ?? null;

        const weatherCode =
            hourly.weather_code?.[i] ?? null;

        const visibility =
            hourly.visibility?.[i] != null
                ? Number(hourly.visibility[i]) / 1000
                : null;

        const cloudCover =
            hourly.cloud_cover?.[i] ?? null;

        const uvIndex =
            hourly.uv_index?.[i] ?? null;

        const dewPoint =
            hourly.dew_point_2m?.[i] ?? null;

        const weatherCondition =
            getWeatherCondition(weatherCode);

        const windDirection =
            getWindDirection(windDegree);

        try {
            // uq_tsag_agaar UNIQUE KEY:
            // stants_dugaar + tsag + eh_urvalj + turul
            //
            // Ижил түлхүүртэй мөр байвал UPDATE.
            // Байхгүй бол INSERT.
            await prisma.$executeRaw`
                INSERT INTO tsag_agaar (
                    stants_dugaar,
                    tsag,
                    temperatur_c,
                    medregdeh_c,
                    chigleg_huvi,
                    daralt_hpa,
                    salhiny_hurd_ms,
                    salhiny_chiglel,
                    salhiny_delbee_ms,
                    haragts_km,
                    uulshil_huvi,
                    tsag_agaar_nohtsol,
                    hur_tunadas_mm,
                    hur_tunadas_magadlal_huvi,
                    tsas_cm,
                    uv_index,
                    shuurdyn_tseg_c,
                    eh_urvalj,
                    turul
                )
                VALUES (
                    ${stantsDugaar},
                    ${tsag},
                    ${temperature},
                    ${feelsLike},
                    ${humidity},
                    ${pressure},
                    ${windSpeed},
                    ${windDirection},
                    ${windGust},
                    ${visibility},
                    ${cloudCover},
                    ${weatherCondition},
                    ${precipitation},
                    ${precipitationProbability},
                    ${snowfall},
                    ${uvIndex},
                    ${dewPoint},
                    ${SOURCE},
                    ${WEATHER_TYPE}
                )
                ON DUPLICATE KEY UPDATE
                    temperatur_c = VALUES(temperatur_c),
                    medregdeh_c = VALUES(medregdeh_c),
                    chigleg_huvi = VALUES(chigleg_huvi),
                    daralt_hpa = VALUES(daralt_hpa),
                    salhiny_hurd_ms = VALUES(salhiny_hurd_ms),
                    salhiny_chiglel = VALUES(salhiny_chiglel),
                    salhiny_delbee_ms = VALUES(salhiny_delbee_ms),
                    haragts_km = VALUES(haragts_km),
                    uulshil_huvi = VALUES(uulshil_huvi),
                    tsag_agaar_nohtsol = VALUES(tsag_agaar_nohtsol),
                    hur_tunadas_mm = VALUES(hur_tunadas_mm),
                    hur_tunadas_magadlal_huvi =
                        VALUES(hur_tunadas_magadlal_huvi),
                    tsas_cm = VALUES(tsas_cm),
                    uv_index = VALUES(uv_index),
                    shuurdyn_tseg_c = VALUES(shuurdyn_tseg_c),
                    hadgalsan_ognoo = CURRENT_TIMESTAMP
            `;

            processed++;
        } catch (error) {
            failed++;

            console.error(
                `❌ ${stantsDugaar} | ${tsag} хадгалах алдаа:`,
                error.message
            );
        }
    }

    console.log(`✅ Боловсруулсан мөр: ${processed}`);
    console.log(`❌ Алдаатай мөр: ${failed}`);

    return {
        received: times.length,
        processed,
        failed,
    };
}

// =====================================================
// MAIN
// =====================================================

async function main() {
    console.log("");
    console.log("========================================");
    console.log("🌤️ OPEN-METEO WEATHER IMPORT");
    console.log("========================================");
    console.log(`🗄️ Database: ${process.env.DB_NAME || "weather_db"}`);
    console.log(`📋 Table: tsag_agaar`);
    console.log(`🕒 Timezone: ${TIMEZONE}`);
    console.log(`📅 Forecast: ${FORECAST_HOURS} цаг`);
    console.log("🔁 Давхардсан мөрийг шинэчилнэ");
    console.log("========================================");

    try {
        const stations = await prisma.stantsuud.findMany({
            select: {
                stantsDugaar: true,
                ner: true,
                urgurug: true,
                urtrag: true,
            },
            orderBy: {
                stantsDugaar: "asc",
            },
        });

        console.log(`📍 Нийт станц: ${stations.length}`);

        let success = 0;
        let failedStations = 0;
        let totalProcessed = 0;
        let totalRowErrors = 0;

        for (const station of stations) {
            try {
                const result =
                    await saveStationWeather(station);

                totalProcessed += result.processed;
                totalRowErrors += result.failed;

                if (result.failed > 0) {
                    failedStations++;
                } else {
                    success++;
                }
            } catch (error) {
                failedStations++;

                console.error(
                    `❌ ${station.stantsDugaar} - ${station.ner}`,
                    error.message
                );
            }

            // Станц хооронд бага завсарлага авна.
            await new Promise((resolve) =>
                setTimeout(resolve, 300)
            );
        }

        console.log("");
        console.log("========================================");
        console.log("📊 IMPORT ДУУСЛАА");
        console.log("========================================");
        console.log(`✅ Амжилттай станц: ${success}`);
        console.log(`❌ Алдаатай станц: ${failedStations}`);
        console.log(`💾 Боловсруулсан мөр: ${totalProcessed}`);
        console.log(`❌ Алдаатай мөр: ${totalRowErrors}`);
        console.log(`📍 Нийт станц: ${stations.length}`);
        console.log("========================================");
    } catch (error) {
        console.error("❌ IMPORT ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// =====================================================
// START
// =====================================================

main().catch((error) => {
    console.error("❌ FATAL IMPORT ERROR:", error);

    process.exitCode = 1;
});
