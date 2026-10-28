import prisma from "../../prisma.js";

export async function getUzuulelt(
    station,
    period = "7"
) {

    let dateCondition = "";

    // ==============================
    // ӨНӨӨДӨР
    // ==============================
    if (period === "today") {

        dateCondition = `
            AND DATE(ajiglasan_ognoo) = CURDATE()
        `;
    }

    // ==============================
    // СҮҮЛИЙН 7 ХОНОГ
    // ==============================
    else if (period === "7") {

        dateCondition = `
            AND ajiglasan_ognoo >=
                DATE_SUB(NOW(), INTERVAL 7 DAY)
        `;
    }

    // ==============================
    // СҮҮЛИЙН 1 САР
    // ==============================
    else if (period === "month") {

        dateCondition = `
            AND ajiglasan_ognoo >=
                DATE_SUB(NOW(), INTERVAL 1 MONTH)
        `;
    }

    // ==============================
    // БУРУУ PERIOD
    // ==============================
    else {

        throw new Error(
            "period нь today, 7 эсвэл month байна"
        );
    }


    // ==============================
    // НЭГТГЭСЭН ҮЗҮҮЛЭЛТ
    // ==============================

    const sql = `

        SELECT

            COUNT(*) AS hemjiltiin_too,

            MIN(temperatur_c)
                AS hamgiin_baga_temperatur,

            MAX(temperatur_c)
                AS hamgiin_ih_temperatur,

            AVG(temperatur_c)
                AS dundaj_temperatur,

            AVG(chigleg_huvi)
                AS dundaj_chigleg_huvi,

            AVG(salhiny_hurd_ms)
                AS dundaj_salhiny_hurd_ms,

            MAX(salhiny_hurd_ms)
                AS hamgiin_ih_salhiny_hurd_ms,

            SUM(hur_tunadas_mm)
                AS niit_hur_tunadas_mm,

            AVG(daralt_hpa)
                AS dundaj_daralt_hpa,

            AVG(uulshil_huvi)
                AS dundaj_uulshil_huvi,

            AVG(uv_index)
                AS dundaj_uv_index

        FROM odoogiin_tsag_agaar

        WHERE
            stants_dugaar = ?

            ${dateCondition}

    `;


    // ==============================
    // DATABASE QUERY
    // ==============================

    const data =
        await prisma.$queryRawUnsafe(
            sql,
            Number(station)
        );


    // ==============================
    // DATA БАЙХГҮЙ
    // ==============================

    if (
        data.length === 0 ||
        Number(data[0].hemjiltiin_too) === 0
    ) {

        return null;
    }


    const item = data[0];


    // ==============================
    // JSON БОЛГОЖ БУЦААХ
    // ==============================

    return {

        hemjiltiin_too:
            Number(
                item.hemjiltiin_too
            ),

        hamgiin_baga_temperatur:
            item.hamgiin_baga_temperatur !== null
                ? Number(
                    item.hamgiin_baga_temperatur
                )
                : null,

        hamgiin_ih_temperatur:
            item.hamgiin_ih_temperatur !== null
                ? Number(
                    item.hamgiin_ih_temperatur
                )
                : null,

        dundaj_temperatur:
            item.dundaj_temperatur !== null
                ? Number(
                    item.dundaj_temperatur
                )
                : null,

        dundaj_chigleg_huvi:
            item.dundaj_chigleg_huvi !== null
                ? Number(
                    item.dundaj_chigleg_huvi
                )
                : null,

        dundaj_salhiny_hurd_ms:
            item.dundaj_salhiny_hurd_ms !== null
                ? Number(
                    item.dundaj_salhiny_hurd_ms
                )
                : null,

        hamgiin_ih_salhiny_hurd_ms:
            item.hamgiin_ih_salhiny_hurd_ms !== null
                ? Number(
                    item.hamgiin_ih_salhiny_hurd_ms
                )
                : null,

        niit_hur_tunadas_mm:
            item.niit_hur_tunadas_mm !== null
                ? Number(
                    item.niit_hur_tunadas_mm
                )
                : null,

        dundaj_daralt_hpa:
            item.dundaj_daralt_hpa !== null
                ? Number(
                    item.dundaj_daralt_hpa
                )
                : null,

        dundaj_uulshil_huvi:
            item.dundaj_uulshil_huvi !== null
                ? Number(
                    item.dundaj_uulshil_huvi
                )
                : null,

        dundaj_uv_index:
            item.dundaj_uv_index !== null
                ? Number(
                    item.dundaj_uv_index
                )
                : null
    };
}