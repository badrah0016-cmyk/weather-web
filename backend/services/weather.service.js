import prisma from "../prisma.js";


// =====================================================
// НЭГТГЭСЭН ЦАГ АГААРЫН МЭДЭЭЛЭЛ
// =====================================================

export async function getWeather(stantsDugaar) {

    const station = await prisma.$queryRaw`

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
            ${String(stantsDugaar)}

        LIMIT 1

    `;


    if (station.length === 0) {
        return null;
    }


    const odoogiinTsagAgaar = await prisma.$queryRaw`

        SELECT
            id,
            stants_dugaar,
            ajiglasan_ognoo,
            temperatur_c,
            medregdeh_c,
            chigleg_huvi,
            daralt_hpa,
            salhiny_hurd_ms,
            salhiny_chiglel,
            salhiny_delbee_ms,
            haragts_km,
            uulshil_huvi,
            tsag_agaar_nohtsol,
            hur_tunadas_mm,
            uv_index,
            shuurdyn_tseg_c,
            eh_urvalj

        FROM odoogiin_tsag_agaar

        WHERE stants_dugaar =
            ${String(stantsDugaar)}

        ORDER BY
            ajiglasan_ognoo DESC

        LIMIT 1

    `;


    const uridchilsanMedee = await prisma.$queryRaw`

        SELECT
            id,
            stants_dugaar,
            ognoo,
            garig,
            temperatur_min_c,
            temperatur_max_c,
            nohtsol,
            hur_tunadas_magadlalt_huvi,
            hur_tunadas_mm,
            salhiny_hurd_ms,
            chigleg_huvi,
            nar_mandah,
            nar_jargah,
            eh_urvalj,
            hadgalsan_ognoo

        FROM uridchilsan_medee

        WHERE stants_dugaar =
            ${String(stantsDugaar)}

        ORDER BY
            ognoo ASC

    `;


    const agaarChanar = await prisma.$queryRaw`

        SELECT
            id,
            stants_dugaar,
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
            shinechilsen_ognoo

        FROM agaar_chanar

        WHERE stants_dugaar =
            ${String(stantsDugaar)}

        ORDER BY
            shinechilsen_ognoo DESC

        LIMIT 1

    `;


    const sanuulga = await prisma.$queryRaw`

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


    return {

        stants: station[0],

        odoogiin_tsag_agaar:
            odoogiinTsagAgaar[0] || null,

        uridchilsan_medee:
            uridchilsanMedee,

        agaar_chanar:
            agaarChanar[0] || null,

        tsag_agaar_sanuulga:
            sanuulga

    };
}