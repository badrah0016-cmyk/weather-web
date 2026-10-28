import prisma from "../prisma.js";


// =====================================================
// БҮХ ЦАГ АГААРЫН САНУУЛГА
// =====================================================

export async function getAllTsagAgaarSanuulga() {

    const data = await prisma.$queryRaw`

        SELECT
            id,
            turul,
            hundrel,
            garchig,
            tailbar,
            nolooloh_bus,
            ehleh_ognoo,
            duusah_ognoo,
            idevhtei,
            hadgalsan_ognoo

        FROM tsag_agaar_sanuulga

        ORDER BY
            ehleh_ognoo DESC

    `;

    return data;
}


// =====================================================
// ЗӨВХӨН ИДЭВХТЭЙ САНУУЛГА
// =====================================================

export async function getActiveTsagAgaarSanuulga() {

    const data = await prisma.$queryRaw`

        SELECT
            id,
            turul,
            hundrel,
            garchig,
            tailbar,
            nolooloh_bus,
            ehleh_ognoo,
            duusah_ognoo,
            idevhtei,
            hadgalsan_ognoo

        FROM tsag_agaar_sanuulga

        WHERE idevhtei = TRUE

        ORDER BY
            ehleh_ognoo DESC

    `;

    return data;
}


// =====================================================
// НЭГ САНУУЛГА
// =====================================================

export async function getTsagAgaarSanuulgaById(id) {

    const data = await prisma.$queryRaw`

        SELECT
            id,
            turul,
            hundrel,
            garchig,
            tailbar,
            nolooloh_bus,
            ehleh_ognoo,
            duusah_ognoo,
            idevhtei,
            hadgalsan_ognoo

        FROM tsag_agaar_sanuulga

        WHERE id = ${String(id)}

        LIMIT 1

    `;

    return data;
}