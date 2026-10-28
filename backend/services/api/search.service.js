import prisma from "../../prisma.js";

export async function searchLocations(keyword) {

    const words = keyword
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0);

    const conditions = [];

    for (const word of words) {

        const searchKeyword = `%${word}%`;

        conditions.push(
            prisma.$queryRaw`
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

                WHERE
                    s.ner LIKE ${searchKeyword}
                    OR s.ner_en LIKE ${searchKeyword}
                    OR s.aimag LIKE ${searchKeyword}
                    OR s.stants_dugaar LIKE ${searchKeyword}

                AND (
                    w.ajiglasan_ognoo IS NULL
                    OR w.ajiglasan_ognoo = (
                        SELECT MAX(w2.ajiglasan_ognoo)
                        FROM odoogiin_tsag_agaar w2
                        WHERE w2.stants_dugaar = s.stants_dugaar
                    )
                )

                ORDER BY
                    s.aimag ASC,
                    s.ner ASC
            `
        );
    }

    const results = await Promise.all(conditions);

    let data = results.flat();

    // Олон үгтэй хайлт бол бүх үгэнд таарсан
    // station-ийг шүүж үлдээнэ
    if (words.length > 1) {

        const grouped = {};

        for (const row of data) {

            const key = row.stants_dugaar;

            if (!grouped[key]) {
                grouped[key] = {
                    row,
                    matchedWords: []
                };
            }

            grouped[key].matchedWords.push(
                ...words.filter(word =>
                    row.ner?.includes(word) ||
                    row.aimag?.includes(word) ||
                    row.ner_en?.includes(word)
                )
            );
        }

        data = Object.values(grouped)
            .filter(item =>
                new Set(item.matchedWords).size === words.length
            )
            .map(item => item.row);
    }

    return data;
}