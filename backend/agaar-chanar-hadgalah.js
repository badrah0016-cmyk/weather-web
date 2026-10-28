import "dotenv/config";
import axios from "axios";

import { retry } from "./utils/retry.js";
import { agaarChanarLogger } from "./utils/logger.js";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

// =====================================================
// 1. MYSQL + PRISMA
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
// 2. WEATHER API ТОХИРГОО
// =====================================================

const WEATHER_API_URL = (
    process.env.WEATHER_API_URL ||
    "https://api.weather.gov.mn/api/v1"
).replace(/\/+$/, "");

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!WEATHER_API_KEY) {
    throw new Error(
        "WEATHER_API_KEY .env файлд тохируулаагүй байна."
    );
}

// =====================================================
// 3. API ХҮСЭЛТ
// =====================================================

async function apiGet(path, params = {}) {
    const url = `${WEATHER_API_URL}${path}`;

    try {
        const response = await retry(
            () =>
                axios.get(url, {
                    params,
                    headers: {
                        "X-API-Key": WEATHER_API_KEY,
                        Accept: "application/json",
                    },
                    timeout: 30000,
                }),
            3,
            2000,
            agaarChanarLogger
        );

        const result = response.data;

        if (result?.success === false) {
            throw new Error(
                result.message || `API хүсэлт амжилтгүй: ${path}`
            );
        }

        return result;
    } catch (error) {
        agaarChanarLogger.error(
            `API хүсэлтийн алдаа: ${path} — ${error.message}`
        );

        if (error.response) {
            agaarChanarLogger.error(
                `HTTP status: ${error.response.status}`
            );

            agaarChanarLogger.error(
                `API хариу: ${JSON.stringify(error.response.data)}`
            );
        }

        throw error;
    }
}

// =====================================================
// 4. ТУСЛАХ ФУНКЦҮҮД
// =====================================================

function toNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function toText(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    return String(value);
}

function toDate(value) {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function toMysqlDateTime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function getFirstDefined(...values) {
    return values.find(
        (value) => value !== undefined && value !== null
    );
}

function getApiPayload(response) {
    // Зарим API хариу { data: {...} } хэлбэртэй.
    // Зарим нь { data: { data: {...} } } хэлбэртэй.
    if (
        response?.data?.data &&
        typeof response.data.data === "object"
    ) {
        return response.data.data;
    }

    if (
        response?.data &&
        typeof response.data === "object"
    ) {
        return response.data;
    }

    return response;
}

// =====================================================
// 5. API СТАНЦЫН ЖАГСААЛТ
// GET /weather/air-quality/stations
// =====================================================

async function getAirQualityStations() {
    const response = await apiGet(
        "/weather/air-quality/stations"
    );

    const stations = getFirstDefined(
        response?.data,
        response?.data?.data,
        response?.stations
    );

    if (!Array.isArray(stations)) {
        agaarChanarLogger.error(
            "Станцын API түүхий хариу:"
        );

        console.dir(response, { depth: 5 });

        throw new Error(
            "API станцын жагсаалт массив хэлбэрээр ирсэнгүй."
        );
    }

    const validStations = stations.filter(
        (station) =>
            station?.sid !== undefined &&
            station?.sid !== null &&
            String(station.sid).trim() !== ""
    );

    if (validStations.length === 0) {
        throw new Error(
            "API станцын жагсаалт хоосон байна."
        );
    }

    return validStations;
}

// =====================================================
// 6. ХҮСНЭГТ ШАЛГАХ
// =====================================================

async function checkTables() {
    const result = await prisma.$queryRaw`
        SELECT TABLE_NAME AS tableName
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (
              'agaar_chanar_stantsuud',
              'agaar_chanar_api'
          )
    `;

    const names = result.map((row) =>
        String(
            row.tableName ??
            row.table_name ??
            row.TABLENAME ??
            row.TABLE_NAME ??
            Object.values(row)[0] ??
            ""
        ).toLowerCase()
    );

    const dbResult = await prisma.$queryRaw`
        SELECT DATABASE() AS dbName
    `;

    agaarChanarLogger.info(
        `Өгөгдлийн сан: ${JSON.stringify(dbResult)}`
    );

    agaarChanarLogger.info(
        `Олдсон хүснэгтүүд: ${names.join(", ")}`
    );

    const requiredTables = [
        "agaar_chanar_stantsuud",
        "agaar_chanar_api",
    ];

    const missingTables = requiredTables.filter(
        (table) => !names.includes(table)
    );

    if (missingTables.length > 0) {
        throw new Error(
            `Хүснэгт олдсонгүй: ${missingTables.join(", ")}. ` +
            "DB_NAME болон MySQL холболтоо шалгана уу."
        );
    }

    agaarChanarLogger.info(
        "Шаардлагатай хүснэгтүүд бүгд байна."
    );
}

// =====================================================
// 7. СТАНЦЫН МЭДЭЭЛЭЛ ХАДГАЛАХ
// =====================================================

async function saveStations(stations) {
    let saved = 0;
    let failed = 0;

    for (const station of stations) {
        const sid = String(station.sid);

        try {
            const name = String(
                station.name ??
                station.ner ??
                `Станц ${sid}`
            );

            const lat = toNumber(
                station.lat ?? station.latitude
            );

            const lng = toNumber(
                station.lng ??
                station.lon ??
                station.longitude
            );

            await prisma.$executeRaw`
                INSERT INTO agaar_chanar_stantsuud (
                    sid,
                    ner,
                    urgurug,
                    urtrag,
                    eh_urvalj
                )
                VALUES (
                    ${sid},
                    ${name},
                    ${lat},
                    ${lng},
                    'weather.gov.mn'
                )
                ON DUPLICATE KEY UPDATE
                    ner = VALUES(ner),
                    urgurug = VALUES(urgurug),
                    urtrag = VALUES(urtrag),
                    eh_urvalj = VALUES(eh_urvalj)
            `;

            saved++;

        } catch (error) {
            failed++;

            agaarChanarLogger.error(
                `Станц хадгалах алдаа ${sid}: ${error.message}`
            );
        }
    }

    agaarChanarLogger.info(
        `Станц хадгалалт: ${saved} амжилттай, ${failed} алдаатай`
    );

    if (failed > 0) {
        throw new Error(
            `${failed} станц хадгалагдсангүй. Импорт зогслоо.`
        );
    }
}

// =====================================================
// 8. НЭГ СТАНЦЫН ХЭМЖИЛТ АВАХ
// GET /weather/air-quality?station=SID
// =====================================================

async function getAirQuality(sid) {
    const response = await apiGet(
        "/weather/air-quality",
        { station: sid }
    );

    // API RAW RESPONSE: энд data хувьсагчийг
    // зарлахаас өмнө ашиглахгүй.
    agaarChanarLogger.info(
        `========== ${sid} API RAW RESPONSE ==========`
    );

    console.dir(response, {
        depth: 6,
        colors: false,
    });

    agaarChanarLogger.info(
        "============================================"
    );

    const data = getApiPayload(response);

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new Error(
            `${sid}: API хэмжилтийн объект буцаасангүй.`
        );
    }

    return data;
}

// =====================================================
// 9. НЭГ СТАНЦЫН ХЭМЖИЛТИЙГ DB-Д ХАДГАЛАХ
// =====================================================

async function saveOneAirQuality(station) {
    const sid = String(station.sid);

    // 1. API-аас хэмжилт авна.
    const data = await getAirQuality(sid);

    // 2. API талбаруудыг шалгаж уншина.
    const actualSid = String(
        getFirstDefined(
            data.stationId,
            data.station_id,
            data.sid,
            sid
        )
    );

    if (actualSid !== sid) {
        throw new Error(
            `${sid}: SID зөрүүтэй байна. API=${actualSid}`
        );
    }

    const measuredAtValue = getFirstDefined(
        data.timestamp,
        data.measuredAt,
        data.measured_at,
        data.hemjsenOgnoo,
        data.hemjsen_ognoo,
        data.updatedAt,
        data.updated_at
    );

    const measuredAt = toDate(measuredAtValue);

    if (!measuredAt) {
        throw new Error(
            `${sid}: API timestamp байхгүй эсвэл буруу байна. ` +
            `Огнооны талбарууд: ${Object.keys(data).join(", ")}`
        );
    }

    // 3. Зарим API бохирдуулагчдыг pollutants объектод,
    // зарим нь үндсэн объектод шууд буцааж болно.
    const pollutants =
        data.pollutants ??
        data.measurements ??
        data.values ??
        data;

    const aqi = toNumber(
        getFirstDefined(
            data.aqi,
            data.AQI,
            data.usAqi,
            data.us_aqi
        )
    );

    const category = toText(
        getFirstDefined(
            data.category,
            data.angilal
        )
    );

    const categoryMn = toText(
        getFirstDefined(
            data.categoryMn,
            data.category_mn,
            data.angilalMn,
            data.angilal_mn
        )
    );

    const pm25 = toNumber(
        getFirstDefined(
            pollutants.pm25,
            pollutants.PM25,
            data.pm25,
            data.PM25
        )
    );

    const pm10 = toNumber(
        getFirstDefined(
            pollutants.pm10,
            pollutants.PM10,
            data.pm10,
            data.PM10
        )
    );

    const no2 = toNumber(
        getFirstDefined(
            pollutants.no2,
            pollutants.NO2,
            data.no2,
            data.NO2
        )
    );

    const so2 = toNumber(
        getFirstDefined(
            pollutants.so2,
            pollutants.SO2,
            data.so2,
            data.SO2
        )
    );

    const co = toNumber(
        getFirstDefined(
            pollutants.co,
            pollutants.CO,
            data.co,
            data.CO
        )
    );

    const o3 = toNumber(
        getFirstDefined(
            pollutants.o3,
            pollutants.O3,
            data.o3,
            data.O3
        )
    );

    const advice = toText(
        getFirstDefined(
            data.healthAdvice,
            data.health_advice,
            data.eruulMendZuvlumj,
            data.eruul_mend_zuvlumj
        )
    );

    const source =
        toText(
            getFirstDefined(
                data.source,
                data.ehUrvalj,
                data.eh_urvalj
            )
        ) || "weather.gov.mn";

    // Хоосон объект эсвэл огноо л ирсэн тохиолдолд
    // утгагүй хэмжилт хадгалахгүй.
    const hasMeasurement =
        aqi !== null ||
        pm25 !== null ||
        pm10 !== null ||
        no2 !== null ||
        so2 !== null ||
        co !== null ||
        o3 !== null;

    if (!hasMeasurement) {
        throw new Error(
            `${sid}: API хариунд AQI болон бохирдуулагчийн ` +
            `хэмжилтийн утга олдсонгүй. Талбарууд: ` +
            Object.keys(data).join(", ")
        );
    }

    if (aqi === null) {
        agaarChanarLogger.warn(
            `${sid}: AQI байхгүй; бусад хэмжилт байвал хадгална.`
        );
    }

    const measuredAtSql = toMysqlDateTime(measuredAt);

    // 4. MySQL-д хадгалах.
    // station_sid + hemjsen_ognoo нь давхардлын түлхүүр
    // байх ёстой.
    await prisma.$executeRaw`
        INSERT INTO agaar_chanar_api (
            station_sid,
            aqi,
            angilal,
            angilal_mn,
            pm25,
            pm10,
            no2,
            so2,
            co,
            o3,
            eruul_mend_zuvlumj,
            hemjsen_ognoo,
            eh_urvalj
        )
        VALUES (
            ${sid},
            ${aqi},
            ${category},
            ${categoryMn},
            ${pm25},
            ${pm10},
            ${no2},
            ${so2},
            ${co},
            ${o3},
            ${advice},
            ${measuredAtSql},
            ${source}
        )
        ON DUPLICATE KEY UPDATE
            aqi = VALUES(aqi),
            angilal = VALUES(angilal),
            angilal_mn = VALUES(angilal_mn),
            pm25 = VALUES(pm25),
            pm10 = VALUES(pm10),
            no2 = VALUES(no2),
            so2 = VALUES(so2),
            co = VALUES(co),
            o3 = VALUES(o3),
            eruul_mend_zuvlumj = VALUES(eruul_mend_zuvlumj),
            eh_urvalj = VALUES(eh_urvalj)
    `;

    return {
        sid,
        name: station.name ?? station.ner ?? `Станц ${sid}`,
        aqi,
        angilal: categoryMn || category,
        pm25,
        pm10,
        measuredAt: measuredAtSql,
        source,
    };
}

// =====================================================
// 10. ҮНДСЭН ИМПОРТ
// =====================================================

async function saveAirQuality() {
    const startTime = Date.now();

    let apiSuccessCount = 0;
    let dbSuccessCount = 0;
    let errorCount = 0;

    agaarChanarLogger.info("");
    agaarChanarLogger.info(
        "========================================"
    );
    agaarChanarLogger.info(
        "АГААРЫН ЧАНАРЫН API IMPORT ЭХЭЛЛЭЭ"
    );
    agaarChanarLogger.info(
        "========================================"
    );

    try {
        await checkTables();

        const stations = await getAirQualityStations();

        agaarChanarLogger.info(
            `API-аас ирсэн станц: ${stations.length}`
        );

        await saveStations(stations);

        for (const station of stations) {
            const sid = String(station.sid);

            try {
                agaarChanarLogger.info(
                    `${sid} — ${station.name ?? station.ner ?? "Нэргүй станц"}`
                );

                const result = await saveOneAirQuality(station);

                apiSuccessCount++;
                dbSuccessCount++;

                agaarChanarLogger.info(
                    `AQI: ${result.aqi ?? "-"}`
                );

                agaarChanarLogger.info(
                    `Ангилал: ${result.angilal ?? "-"}`
                );

                agaarChanarLogger.info(
                    `PM2.5: ${result.pm25 ?? "-"}`
                );

                agaarChanarLogger.info(
                    `PM10: ${result.pm10 ?? "-"}`
                );

                agaarChanarLogger.info(
                    `Хэмжсэн цаг: ${result.measuredAt}`
                );

                agaarChanarLogger.info(
                    `Эх үүсвэр: ${result.source}`
                );

                agaarChanarLogger.info(
                    "Хэмжилт амжилттай хадгалагдлаа."
                );
            } catch (error) {
                errorCount++;

                agaarChanarLogger.error(
                    `${sid} станцын импорт амжилтгүй: ${error.message}`
                );

                if (error.response) {
                    agaarChanarLogger.error(
                        `HTTP status: ${error.response.status}`
                    );

                    agaarChanarLogger.error(
                        `API хариу: ${JSON.stringify(error.response.data)}`
                    );
                }
            }

            await new Promise((resolve) =>
                setTimeout(resolve, 150)
            );
        }

        const stationCount = await prisma.$queryRaw`
            SELECT COUNT(*) AS total
            FROM agaar_chanar_stantsuud
        `;

        const measurementCount = await prisma.$queryRaw`
            SELECT COUNT(*) AS total
            FROM agaar_chanar_api
        `;

        const elapsedSeconds = (
            (Date.now() - startTime) / 1000
        ).toFixed(2);

        agaarChanarLogger.info("");
        agaarChanarLogger.info(
            "========================================"
        );
        agaarChanarLogger.info(
            "АГААРЫН ЧАНАРЫН IMPORT ҮР ДҮН"
        );
        agaarChanarLogger.info(
            "========================================"
        );

        agaarChanarLogger.info(
            `API станц: ${stations.length}`
        );

        agaarChanarLogger.info(
            `Амжилттай боловсруулсан хэмжилт: ${apiSuccessCount}`
        );

        agaarChanarLogger.info(
            `DB-д амжилттай хадгалсан: ${dbSuccessCount}`
        );

        agaarChanarLogger.info(
            `Алдаатай станц: ${errorCount}`
        );

        agaarChanarLogger.info(
            `DB дахь станц: ${String(stationCount[0]?.total ?? 0)}`
        );

        agaarChanarLogger.info(
            `DB дахь нийт хэмжилт: ${String(measurementCount[0]?.total ?? 0)}`
        );

        agaarChanarLogger.info(
            `Зарцуулсан хугацаа: ${elapsedSeconds} секунд`
        );

        if (errorCount === 0) {
            agaarChanarLogger.info(
                "Бүх станцын импорт амжилттай."
            );
        } else {
            agaarChanarLogger.warn(
                "Импорт хэсэгчлэн амжилттай. Алдаатай станцын логийг шалгана уу."
            );
        }

        agaarChanarLogger.info(
            "Хуучин agaar_chanar хүснэгтэд өөрчлөлт оруулаагүй."
        );

    } catch (error) {
        process.exitCode = 1;

        agaarChanarLogger.error(
            `IMPORT SYSTEM ERROR: ${error.stack || error.message}`
        );

    } finally {
        await prisma.$disconnect();

        agaarChanarLogger.info(
            "MySQL холболт хаагдлаа."
        );
    }
}

// =====================================================
// 11. АЖИЛЛУУЛАХ
// =====================================================

saveAirQuality();
