import prisma from "../prisma.js";


// =====================================================
// БҮХ ГОЛ УСНЫ МЭДЭЭЛЭЛ
// =====================================================

export async function getAllGolUsHydrology() {

    const data = await prisma.$queryRaw`

        SELECT
            id,
            ner,
            usny_tuvshin,
            heviin_tuvshin,
            ueriin_bosgo,
            ursgal_hurd,
            usny_temp_c,
            tuluv,
            handlaga,
            shinechilsen_ognoo

        FROM gol_us_hydrology

        ORDER BY
            ner ASC

    `;

    return data;
}


// =====================================================
// НЭГ ГОЛЫН МЭДЭЭЛЭЛ
// =====================================================

export async function getGolUsHydrologyById(id) {

    const data = await prisma.$queryRaw`

        SELECT
            id,
            ner,
            usny_tuvshin,
            heviin_tuvshin,
            ueriin_bosgo,
            ursgal_hurd,
            usny_temp_c,
            tuluv,
            handlaga,
            shinechilsen_ognoo

        FROM gol_us_hydrology

        WHERE id =
            ${String(id)}

        LIMIT 1

    `;

    return data;
}