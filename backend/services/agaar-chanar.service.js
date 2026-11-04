
import prisma from "../prisma.js";

// =====================================================
// БҮХ СТАНЦЫН ХАМГИЙН СҮҮЛИЙН ХЭМЖИЛТ
// =====================================================

export async function getAllAgaarChanar() {
    return await prisma.$queryRaw`
        SELECT
            s.sid AS stants_dugaar,
            s.sid AS station_sid,
            s.ner AS ner,
            s.urgurug AS urgurug,
            s.urtrag AS urtrag,

            a.id AS id,
            a.aqi AS aqi,
            a.angilal AS angilal,
            a.angilal_mn AS angilal_mn,
            a.pm25 AS pm25,
            a.pm10 AS pm10,
            a.no2 AS no2,
            a.so2 AS so2,
            a.co AS co,
            a.o3 AS o3,
            a.eruul_mend_zuvlumj AS eruul_mend_zuvlumj,
            a.hemjsen_ognoo AS shinechilsen_ognoo,
            a.eh_urvalj AS eh_urvalj

        FROM agaar_chanar_stantsuud AS s

        LEFT JOIN (
            SELECT
                station_sid,
                id,
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
                eh_urvalj,
                ROW_NUMBER() OVER (
                    PARTITION BY station_sid
                    ORDER BY hemjsen_ognoo DESC, id DESC
                ) AS rn
            FROM agaar_chanar_api
        ) AS a
            ON a.station_sid = s.sid
            AND a.rn = 1

        ORDER BY s.sid ASC
    `;
}

// =====================================================
// НЭГ СТАНЦЫН ХЭМЖИЛТИЙН ТҮҮХ
// =====================================================

export async function getAgaarChanarByStation(stantsDugaar) {
    const sid = String(stantsDugaar ?? "").trim();

    if (!sid) {
        throw new Error("Станцын дугаар шаардлагатай.");
    }

    return await prisma.$queryRaw`
        SELECT
            s.sid AS stants_dugaar,
            s.sid AS station_sid,
            s.ner AS ner,
            s.urgurug AS urgurug,
            s.urtrag AS urtrag,

            a.id AS id,
            a.aqi AS aqi,
            a.angilal AS angilal,
            a.angilal_mn AS angilal_mn,
            a.pm25 AS pm25,
            a.pm10 AS pm10,
            a.no2 AS no2,
            a.so2 AS so2,
            a.co AS co,
            a.o3 AS o3,
            a.eruul_mend_zuvlumj AS eruul_mend_zuvlumj,
            a.hemjsen_ognoo AS shinechilsen_ognoo,
            a.eh_urvalj AS eh_urvalj

        FROM agaar_chanar_api AS a

        INNER JOIN agaar_chanar_stantsuud AS s
            ON s.sid = a.station_sid

        WHERE s.sid = ${sid}

        ORDER BY
            a.hemjsen_ognoo DESC,
            a.id DESC
    `;
}

// =====================================================
// НЭГ СТАНЦЫН ХАМГИЙН СҮҮЛИЙН ХЭМЖИЛТ
// =====================================================

export async function getLatestAgaarChanarByStation(stantsDugaar) {
    const sid = String(stantsDugaar ?? "").trim();

    if (!sid) {
        throw new Error("Станцын дугаар шаардлагатай.");
    }

    const data = await prisma.$queryRaw`
        SELECT
            s.sid AS stants_dugaar,
            s.sid AS station_sid,
            s.ner AS ner,
            s.urgurug AS urgurug,
            s.urtrag AS urtrag,

            a.id AS id,
            a.aqi AS aqi,
            a.angilal AS angilal,
            a.angilal_mn AS angilal_mn,
            a.pm25 AS pm25,
            a.pm10 AS pm10,
            a.no2 AS no2,
            a.so2 AS so2,
            a.co AS co,
            a.o3 AS o3,
            a.eruul_mend_zuvlumj AS eruul_mend_zuvlumj,
            a.hemjsen_ognoo AS shinechilsen_ognoo,
            a.eh_urvalj AS eh_urvalj

        FROM agaar_chanar_stantsuud AS s

        LEFT JOIN (
            SELECT
                station_sid,
                id,
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
                eh_urvalj,
                ROW_NUMBER() OVER (
                    PARTITION BY station_sid
                    ORDER BY hemjsen_ognoo DESC, id DESC
                ) AS rn
            FROM agaar_chanar_api
            WHERE station_sid = ${sid}
        ) AS a
            ON a.station_sid = s.sid
            AND a.rn = 1

        WHERE s.sid = ${sid}
        LIMIT 1
    `;

    return data[0] ?? null;
}

// =====================================================
// СТАНЦУУДЫН ХЭМЖИЛТИЙГ ХУГАЦААГААР ХАРЬЦУУЛАХ
// =====================================================

const ALLOWED_METRICS = [
    "aqi",
    "pm25",
    "pm10",
    "no2",
    "so2",
    "co",
    "o3",
];

const ALLOWED_GROUPS = ["hour", "day", "month", "all"];

function validateDate(value, fieldName) {
    const date = String(value ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(
            `${fieldName} огноо YYYY-MM-DD хэлбэртэй байх ёстой.`
        );
    }

    const parsed = new Date(`${date}T00:00:00Z`);

    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
    ) {
        throw new Error(`${fieldName} огноо буруу байна.`);
    }

    return date;
}

export async function compareAgaarChanar({
    stations,
    metric,
    from,
    to,
    group = "day",
}) {
    const stationIds = [
        ...new Set(
            (Array.isArray(stations)
                ? stations
                : String(stations ?? "").split(",")
            )
                .map((id) => String(id).trim())
                .filter((id) => /^\d+$/.test(id))
        ),
    ];

    if (stationIds.length === 0) {
        throw new Error("Харьцуулах станцаа сонгоно уу.");
    }

    if (stationIds.length > 5) {
        throw new Error("Нэг удаад хамгийн ихдээ 5 станц харьцуулна.");
    }

    if (!ALLOWED_METRICS.includes(metric)) {
        throw new Error("Харьцуулах үзүүлэлт буруу байна.");
    }

    if (!ALLOWED_GROUPS.includes(group)) {
        throw new Error("Бүлэглэх төрөл буруу байна.");
    }

    const fromDate = validateDate(from, "Эхлэх");
    const toDate = validateDate(to, "Дуусах");

    if (fromDate > toDate) {
        throw new Error(
            "Эхлэх огноо дуусах огнооноос хойш байж болохгүй."
        );
    }

    // Зөвшөөрөгдсөн баганын нэр
    const columnName = ALLOWED_METRICS.includes(metric)
        ? metric
        : "aqi";

    // Бүлэглэх илэрхийлэл
    const bucketExpression = {
        hour: "DATE_FORMAT(a.hemjsen_ognoo, '%Y-%m-%d %H:00:00')",
        day: "DATE_FORMAT(a.hemjsen_ognoo, '%Y-%m-%d')",
        month: "DATE_FORMAT(a.hemjsen_ognoo, '%Y-%m')",
        all: "'Нийт хугацаа'",
    };

    const bucket = bucketExpression[group];

    // Станцын ID жагсаалт
    const placeholders = stationIds.map(() => "?").join(",");

    const query = `
        SELECT
            a.station_sid AS station_sid,
            ${bucket} AS bucket,

            AVG(a.${columnName}) AS avg_value,
            MIN(a.${columnName}) AS min_value,
            MAX(a.${columnName}) AS max_value,
            COUNT(a.${columnName}) AS count

        FROM agaar_chanar_api AS a

        WHERE a.station_sid IN (${placeholders})
          AND a.hemjsen_ognoo >= ?
          AND a.hemjsen_ognoo < DATE_ADD(?, INTERVAL 1 DAY)
          AND a.${columnName} IS NOT NULL

        GROUP BY a.station_sid, bucket

        ORDER BY
            a.station_sid ASC,
            bucket ASC
    `;

    return await prisma.$queryRawUnsafe(
        query,
        ...stationIds,
        fromDate,
        toDate
    );
}
