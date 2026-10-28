import prisma from "../../prisma.js";

export async function haritsuulahTsagAgaar(stantsuud) {
    const stationList = stantsuud.map(
        station => Number(station)
    );

    const placeholders = stationList
        .map(() => "?")
        .join(",");

    const data = await prisma.$queryRawUnsafe(
        `
        SELECT
            s.stants_dugaar,
            s.ner,
            s.ner_en,
            s.aimag,
            s.urgurug,
            s.urtrag,
            s.undur,

            w.ajiglasan_ognoo,
            w.temperatur_c,
            w.medregdeh_c,
            w.chigleg_huvi,
            w.daralt_hpa,
            w.salhiny_hurd_ms,
            w.salhiny_chiglel,
            w.salhiny_delbee_ms,
            w.haragts_km,
            w.uulshil_huvi,
            w.tsag_agaar_nohtsol,
            w.hur_tunadas_mm,
            w.uv_index,
            w.shuurdyn_tseg_c,
            w.eh_urvalj

        FROM stantsuud s

        LEFT JOIN odoogiin_tsag_agaar w
            ON w.stants_dugaar = s.stants_dugaar
            AND w.ajiglasan_ognoo = (
                SELECT MAX(w2.ajiglasan_ognoo)
                FROM odoogiin_tsag_agaar w2
                WHERE w2.stants_dugaar = s.stants_dugaar
            )

        WHERE s.stants_dugaar IN (${placeholders})

        ORDER BY
            s.aimag ASC,
            s.ner ASC
        `,
        ...stationList
    );

    return data.map(item => ({
        stants_dugaar:
            Number(item.stants_dugaar),

        ner:
            item.ner,

        ner_en:
            item.ner_en,

        aimag:
            item.aimag,

        urgurug:
            item.urgurug,

        urtrag:
            item.urtrag,

        undur:
            item.undur !== null
                ? Number(item.undur)
                : null,

        ajiglasan_ognoo:
            item.ajiglasan_ognoo,

        temperatur_c:
            item.temperatur_c !== null
                ? Number(item.temperatur_c)
                : null,

        medregdeh_c:
            item.medregdeh_c !== null
                ? Number(item.medregdeh_c)
                : null,

        chigleg_huvi:
            item.chigleg_huvi !== null
                ? Number(item.chigleg_huvi)
                : null,

        daralt_hpa:
            item.daralt_hpa !== null
                ? Number(item.daralt_hpa)
                : null,

        salhiny_hurd_ms:
            item.salhiny_hurd_ms !== null
                ? Number(item.salhiny_hurd_ms)
                : null,

        salhiny_chiglel:
            item.salhiny_chiglel,

        salhiny_delbee_ms:
            item.salhiny_delbee_ms !== null
                ? Number(item.salhiny_delbee_ms)
                : null,

        haragts_km:
            item.haragts_km !== null
                ? Number(item.haragts_km)
                : null,

        uulshil_huvi:
            item.uulshil_huvi !== null
                ? Number(item.uulshil_huvi)
                : null,

        tsag_agaar_nohtsol:
            item.tsag_agaar_nohtsol,

        hur_tunadas_mm:
            item.hur_tunadas_mm !== null
                ? Number(item.hur_tunadas_mm)
                : null,

        uv_index:
            item.uv_index !== null
                ? Number(item.uv_index)
                : null,

        shuurdyn_tseg_c:
            item.shuurdyn_tseg_c !== null
                ? Number(item.shuurdyn_tseg_c)
                : null,

        eh_urvalj:
            item.eh_urvalj
    }));
}
