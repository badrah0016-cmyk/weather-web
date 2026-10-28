import prisma from "../../prisma.js";

export async function getLocations(aimag) {

    if (aimag) {

        const data = await prisma.$queryRaw`
            SELECT
                stants_dugaar,
                ner,
                ner_en,
                aimag,
                urgurug,
                urtrag,
                undur
            FROM stantsuud
            WHERE aimag = ${aimag}
            ORDER BY ner ASC
        `;

        return data;
    }

    const data = await prisma.$queryRaw`
        SELECT DISTINCT
            aimag
        FROM stantsuud
        WHERE aimag IS NOT NULL
          AND aimag <> ''
        ORDER BY aimag ASC
    `;

    return data;
}