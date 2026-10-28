
import prisma from "../prisma.js";

// =====================================================
// BIGINT БОЛОН DECIMAL УТГУУДЫГ JSON-Д ТОХИРУУЛАХ
// =====================================================

function serializeBigInt(value) {
    return JSON.parse(
        JSON.stringify(value, (_, item) =>
            typeof item === "bigint" ? Number(item) : item
        )
    );
}

// =====================================================
// МОНГОЛЫН ӨНӨӨДРИЙН ОГНОО
// =====================================================

function getMongoliaToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const date = Object.fromEntries(
        parts.map(({ type, value }) => [type, value])
    );

    return `${date.year}-${date.month}-${date.day}`;
}

// =====================================================
// 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ
// =====================================================

export async function getForecastByStation(station) {
    const stationId = String(station ?? "").trim();

    if (!stationId) {
        throw new Error("Станцын дугаар хоосон байна.");
    }

    if (!/^\d+$/.test(stationId)) {
        throw new Error("Станцын дугаар буруу байна.");
    }

    const today = getMongoliaToday();

    console.log("======================================");
    console.log("7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ");
    console.log("Станц:", stationId);
    console.log("Монголын өнөөдөр:", today);
    console.log("======================================");

    try {
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
            FROM weather_db.uridchilsan_medee
            WHERE stants_dugaar = ${stationId}
              AND ognoo >= ${today}
              AND ognoo < DATE_ADD(
                  CAST(${today} AS DATE),
                  INTERVAL 7 DAY
              )
            ORDER BY ognoo ASC, id DESC
            LIMIT 7
        `;

        const forecast = serializeBigInt(result);

        console.log("Олдсон мөр:", forecast.length);
        console.log(
            "Огноонууд:",
            forecast.map((item) => item.ognoo)
        );
        console.log("======================================");

        return forecast;
    } catch (error) {
        console.error("Урьдчилсан мэдээний SQL алдаа:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Meta:", error.meta);

        throw error;
    }
}
