import prisma from "../prisma.js";


// =====================================================
// БҮХ СТАНЦ АВАХ
// =====================================================

export async function getAllStantsuud() {
    try {
        const stantsuud = await prisma.$queryRaw`

            SELECT
                stants_dugaar,
                ner,
                ner_en,
                aimag,
                urgurug,
                urtrag,
                undur

            FROM stantsuud

            ORDER BY
                stants_dugaar ASC

        `;

        return stantsuud;

    } catch (error) {
        console.error("❌ Бүх станц авах service алдаа:");
        console.error(error);

        throw error;
    }
}


// =====================================================
// НЭГ СТАНЦ АВАХ
// =====================================================

export async function getStantsuudById(stantsDugaar) {
    try {

        // -------------------------------------------------
        // STATION ID VALIDATION
        // -------------------------------------------------

        if (
            stantsDugaar === undefined ||
            stantsDugaar === null ||
            String(stantsDugaar).trim() === ""
        ) {
            throw new Error(
                "stantsDugaar шаардлагатай"
            );
        }


        // -------------------------------------------------
        // DATABASE QUERY
        // -------------------------------------------------

        const stantsuud = await prisma.$queryRaw`

            SELECT
                stants_dugaar,
                ner,
                ner_en,
                aimag,
                urgurug,
                urtrag,
                undur

            FROM stantsuud

            WHERE stants_dugaar =
                ${String(stantsDugaar).trim()}

            LIMIT 1

        `;


        // -------------------------------------------------
        // RETURN
        // -------------------------------------------------

        return stantsuud;

    } catch (error) {
        console.error(
            "❌ Нэг станц авах service алдаа:"
        );

        console.error(error);

        throw error;
    }
}

