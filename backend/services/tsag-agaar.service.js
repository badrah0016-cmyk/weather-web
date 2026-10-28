
import prisma from "../prisma.js";

// =====================================================
// JSON SERIALIZE
// BigInt утгыг JSON-д дамжуулахад тохирох Number болгоно.
// =====================================================

function serializeBigInt(value) {
    return JSON.parse(
        JSON.stringify(value, (_, item) =>
            typeof item === "bigint" ? Number(item) : item
        )
    );
}

// =====================================================
// TIME FORMAT
// =====================================================

function formatTime(value) {
    if (value == null) return null;

    if (value instanceof Date) {
        return `${String(value.getUTCHours()).padStart(2, "0")}:${String(
            value.getUTCMinutes()
        ).padStart(2, "0")}`;
    }

    const text = String(value).trim();

    if (/^\d{2}:\d{2}:\d{2}$/.test(text)) {
        return text.slice(0, 5);
    }

    if (/^\d{2}:\d{2}$/.test(text)) {
        return text;
    }

    const match = text.match(/T(\d{2}):(\d{2})/);

    return match ? `${match[1]}:${match[2]}` : text;
}

// =====================================================
// ULAANBAATAR TIME HELPERS
// =====================================================

function getUBParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const get = (name) =>
        parts.find((item) => item.type === name)?.value;

    return {
        year: Number(get("year")),
        month: Number(get("month")),
        day: Number(get("day")),
        hour: Number(get("hour")),
        minute: Number(get("minute")),
    };
}

// Date-ийн UTC хэсгийг ашиглан MySQL DATETIME мөр үүсгэнэ.
function toMySQLDateTime(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const sec = String(date.getUTCSeconds()).padStart(2, "0");

    return `${y}-${m}-${d} ${h}:${min}:${sec}`;
}

// Улаанбаатарын тухайн цагийг MySQL DATETIME хэлбэрт хөрвүүлнэ.
// Жишээ: одоо UB цагаар 17:52 бол offsetHours=0 -> өнөөдрийн 17:00.
function ubHourString(offsetHours = 0) {
    const parts = getUBParts();

    const date = new Date(
        Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour + offsetHours
        )
    );

    return toMySQLDateTime(date);
}

function normalizeTimestamp(value) {
    if (value instanceof Date) {
        return toMySQLDateTime(value);
    }

    return String(value ?? "")
        .replace("T", " ")
        .slice(0, 19);
}

// =====================================================
// CURRENT WEATHER BY STATION
// GET /weather_db/tsag_agaar/current?station=549
// =====================================================

export async function getCurrentWeatherByStation(station) {
    const stationId = String(station ?? "").trim();

    if (!stationId) {
        throw new Error("Станцын дугаар шаардлагатай.");
    }

    const result = await prisma.$queryRaw`
        SELECT
            t.id,
            t.stants_dugaar,
            s.ner,
            s.ner_en,
            s.aimag,
            s.urgurug,
            s.urtrag,
            s.undur,
            t.tsag,
            t.temperatur_c,
            t.medregdeh_c,
            t.chigleg_huvi,
            t.daralt_hpa,
            t.salhiny_hurd_ms,
            t.salhiny_chiglel,
            t.salhiny_delbee_ms,
            t.haragts_km,
            t.uulshil_huvi,
            t.tsag_agaar_nohtsol,
            t.hur_tunadas_mm,
            t.hur_tunadas_magadlal_huvi,
            t.tsas_cm,
            t.uv_index,
            t.shuurdyn_tseg_c,
            t.eh_urvalj,
            t.turul,
            t.hadgalsan_ognoo
        FROM tsag_agaar AS t
        LEFT JOIN stantsuud AS s
            ON s.stants_dugaar = t.stants_dugaar
        WHERE t.stants_dugaar = ${stationId}
          AND t.turul = 'ODOO'
        ORDER BY t.tsag DESC, t.id DESC
        LIMIT 1
    `;

    return result.length ? serializeBigInt(result[0]) : null;
}

// =====================================================
// ALL STATIONS CURRENT WEATHER
// GET /weather_db/tsag_agaar/current/all
// =====================================================

export async function getAllCurrentWeather() {
    const result = await prisma.$queryRaw`
        SELECT
            t.id,
            t.stants_dugaar,
            s.ner,
            s.ner_en,
            s.aimag,
            s.urgurug,
            s.urtrag,
            s.undur,
            t.tsag,
            t.temperatur_c,
            t.medregdeh_c,
            t.chigleg_huvi,
            t.daralt_hpa,
            t.salhiny_hurd_ms,
            t.salhiny_chiglel,
            t.salhiny_delbee_ms,
            t.haragts_km,
            t.uulshil_huvi,
            t.tsag_agaar_nohtsol,
            t.hur_tunadas_mm,
            t.hur_tunadas_magadlal_huvi,
            t.tsas_cm,
            t.uv_index,
            t.shuurdyn_tseg_c,
            t.eh_urvalj,
            t.turul,
            t.hadgalsan_ognoo
        FROM tsag_agaar AS t
        INNER JOIN (
            SELECT
                stants_dugaar,
                MAX(tsag) AS max_tsag
            FROM tsag_agaar
            WHERE turul = 'ODOO'
            GROUP BY stants_dugaar
        ) AS latest
            ON latest.stants_dugaar = t.stants_dugaar
           AND latest.max_tsag = t.tsag
        LEFT JOIN stantsuud AS s
            ON s.stants_dugaar = t.stants_dugaar
        WHERE t.turul = 'ODOO'
        ORDER BY t.tsag DESC, t.id DESC
    `;

    // Станц бүрээс хамгийн сүүлийн бичлэгийг үлдээнэ.
    const unique = new Map();

    for (const row of result) {
        const key = String(row.stants_dugaar);

        if (!unique.has(key)) {
            unique.set(key, row);
        }
    }

    return serializeBigInt([...unique.values()]);
}

// =====================================================
// HOURLY FORECAST: NEXT 24 HOURS
// GET /weather_db/tsag_agaar/hourly/549
//
// Жишээ:
// Одоогийн UB цаг 17:52 бол
// Эхлэх: өнөөдөр 17:00
// Дуусах: маргааш 17:00
// =====================================================

export async function getHourlyWeatherByStation(station) {
    const stationId = String(station ?? "").trim();

    if (!stationId) {
        throw new Error("Станцын дугаар шаардлагатай.");
    }

    // 1. Станц байгаа эсэхийг шалгах
    const stationResult = await prisma.$queryRaw`
        SELECT
            stants_dugaar,
            ner,
            ner_en,
            aimag,
            urgurug,
            urtrag,
            undur
        FROM stantsuud
        WHERE stants_dugaar = ${stationId}
        LIMIT 1
    `;

    if (!stationResult.length) {
        throw new Error(`Станц олдсонгүй: ${stationId}`);
    }

    // 2. Одоогийн Улаанбаатарын цагийг авч,
    // тухайн цагийн эхлэлээс дараагийн 24 цагийг сонгоно.
    const parts = getUBParts();

    const startDate = new Date(
        Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            0,
            0
        )
    );

    const endDate = new Date(
        startDate.getTime() + 24 * 60 * 60 * 1000
    );

    const startTime = toMySQLDateTime(startDate);
    const endTime = toMySQLDateTime(endDate);

    const currentTime =
        `${String(parts.hour).padStart(2, "0")}:` +
        `${String(parts.minute).padStart(2, "0")}`;

    console.log("\n========== HOURLY FORECAST DEBUG ==========");
    console.log("Station:", stationId);
    console.log("Current UB time:", currentTime);
    console.log("Start:", startTime);
    console.log("End:", endTime);

    // 3. Тухайн станцын хадгалсан урьдчилсан мэдээний хэмжээг шалгах
    const testResult = await prisma.$queryRaw`
        SELECT
            COUNT(*) AS total,
            MIN(tsag) AS first_time,
            MAX(tsag) AS last_time
        FROM tsag_agaar
        WHERE stants_dugaar = ${stationId}
          AND turul = 'URIDCHILSAN'
    `;

    console.log("Forecast rows in DB:", serializeBigInt(testResult));

    // 4. Эхлэх цагийг оруулаад, дуусах цагийг оруулахгүйгээр 24 цагийн
    // урьдчилсан мэдээ авна.
    const result = await prisma.$queryRaw`
        SELECT
            t.id,
            t.stants_dugaar,
            s.ner,
            s.aimag,
            t.tsag,
            t.temperatur_c,
            t.medregdeh_c,
            t.chigleg_huvi,
            t.daralt_hpa,
            t.salhiny_hurd_ms,
            t.salhiny_chiglel,
            t.salhiny_delbee_ms,
            t.haragts_km,
            t.uulshil_huvi,
            t.tsag_agaar_nohtsol,
            t.hur_tunadas_mm,
            t.hur_tunadas_magadlal_huvi,
            t.tsas_cm,
            t.uv_index,
            t.shuurdyn_tseg_c,
            t.eh_urvalj,
            t.turul,
            t.hadgalsan_ognoo
        FROM tsag_agaar AS t
        LEFT JOIN stantsuud AS s
            ON s.stants_dugaar = t.stants_dugaar
        WHERE t.stants_dugaar = ${stationId}
          AND t.turul = 'URIDCHILSAN'
          AND t.tsag >= CAST(${startTime} AS DATETIME)
          AND t.tsag < CAST(${endTime} AS DATETIME)
        ORDER BY t.tsag ASC, t.id DESC
    `;

    // 5. Ижил цагийн олон бичлэг байвал хамгийн эхнийхийг үлдээнэ.
    // SQL-ийн ORDER BY t.tsag ASC, t.id DESC тул тухайн цагийн хамгийн
    // өндөр ID-тай бичлэг эхэнд ирнэ.
    const uniqueHours = new Map();

    for (const row of result) {
        const key = normalizeTimestamp(row.tsag);

        if (!uniqueHours.has(key)) {
            uniqueHours.set(key, row);
        }
    }

    const hourly = [...uniqueHours.values()].sort((a, b) =>
        normalizeTimestamp(a.tsag).localeCompare(
            normalizeTimestamp(b.tsag)
        )
    );

    const data = serializeBigInt(hourly);

    console.log("Matching rows:", result.length);
    console.log("Unique hourly rows:", data.length);
    console.log("===========================================\n");

    return {
        station: serializeBigInt(stationResult[0]),
        timezone: "Asia/Ulaanbaatar",
        count: data.length,
        expectedCount: 24,
        complete: data.length === 24,
        from_time: startTime,
        to_time: endTime,
        current_time: currentTime,
        message:
            data.length === 24
                ? "24 цагийн урьдчилсан мэдээ бүрэн байна."
                : `24 цагт харгалзах ${data.length} бичлэг олдлоо. Урьдчилсан мэдээний импорт болон өгөгдлийн санг шалгана уу.`,
        hourly: data,
    };
}

// =====================================================
// 7 DAY FORECAST
// =====================================================

export async function getForecastByStation(station) {
    const stationId = String(station ?? "").trim();

    if (!stationId) {
        throw new Error("Станцын дугаар шаардлагатай.");
    }

    const result = await prisma.$queryRaw`
        SELECT
            id,
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
            nar_togtoh_tsag,
            eh_urvalj,
            hadgalsan_ognoo
        FROM uridchilsan_medee
        WHERE stants_dugaar = ${stationId}
        ORDER BY ognoo ASC
        LIMIT 7
    `;

    const formatted = result.map((item) => ({
        ...item,
        nar_mandah: formatTime(item.nar_mandah),
        nar_jargah: formatTime(item.nar_jargah),
    }));

    return serializeBigInt(formatted);
}

// =====================================================
// WEATHER HISTORY
// GET /weather_db/tsag_agaar/history/549?hours=24
// GET /weather_db/tsag_agaar/history/549?hours=168
// =====================================================

export async function getHistoryByStation(station, hours = 24) {
    const stationId = String(station ?? "").trim();

    if (!stationId) {
        throw new Error("Станцын дугаар шаардлагатай.");
    }

    const requestedHours = Number(hours);

    const safeHours = Math.min(
        Math.max(
            Number.isFinite(requestedHours)
                ? Math.floor(requestedHours)
                : 24,
            1
        ),
        720
    );

    // Сүүлийн safeHours цагийн эхлэх ба дуусах хязгаар.
    const startTime = ubHourString(-(safeHours - 1));
    const endTime = ubHourString(1);

    const rows = await prisma.$queryRaw`
        SELECT
            t.id,
            t.stants_dugaar,
            t.tsag,
            t.temperatur_c,
            t.medregdeh_c,
            t.chigleg_huvi,
            t.daralt_hpa,
            t.salhiny_hurd_ms,
            t.salhiny_delbee_ms,
            t.hur_tunadas_mm,
            t.turul
        FROM tsag_agaar AS t
        WHERE t.stants_dugaar = ${stationId}
          AND t.turul IN ('ODOO', 'URIDCHILSAN')
          AND t.tsag >= CAST(${startTime} AS DATETIME)
          AND t.tsag < CAST(${endTime} AS DATETIME)
        ORDER BY
            t.tsag ASC,
            CASE
                WHEN t.turul = 'ODOO' THEN 0
                ELSE 1
            END ASC,
            t.id DESC
    `;

    // Ижил цагт бодит хэмжилт байвал түүнийг сонгоно.
    const unique = new Map();

    for (const row of rows) {
        const key = normalizeTimestamp(row.tsag);

        if (!unique.has(key)) {
            unique.set(key, row);
        }
    }

    const data = serializeBigInt([...unique.values()]);

    return {
        station: stationId,
        hours: safeHours,
        from_time: startTime,
        to_time: endTime,
        count: data.length,
        data,
    };
}
