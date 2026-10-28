import "dotenv/config";
import axios from "axios";

import { retry } from "./utils/retry.js";

import {
    odoogiinTsagAgaarLogger,
    uridchilsanMedeeLogger,
    tsagAgaarSanuulgaLogger,
    agaarChanarLogger
} from "./utils/logger.js";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";


// ==========================================
// ЦАГ АГААРЫН API ТОХИРГОО
// ==========================================

const tsagAgaariinApiUrl =
    process.env.WEATHER_API_URL;

const tsagAgaariinApiKey =
    process.env.WEATHER_API_KEY;


// ==========================================
// MYSQL + PRISMA ТОХИРГОО
// ==========================================

const adapter = new PrismaMariaDb({

    host:
        process.env.DB_HOST ||
        "localhost",

    port:
        Number(
            process.env.DB_PORT ||
            3306
        ),

    user:
        process.env.DB_USER ||
        "root",

    password:
        process.env.DB_PASSWORD,

    database:
        process.env.DB_NAME ||
        "weather_db",

    connectionLimit: 7,

    allowPublicKeyRetrieval: true

});


const prisma =
    new PrismaClient({
        adapter
    });


// ==========================================
// ТООЛУУР
// ==========================================

let odoogiinTsagAgaarToo = 0;

let uridchilsanMedeeToo = 0;

let sanuulgaToo = 0;

let agaarChanarToo = 0;

let amjilttaiHadgalsanToo = 0;

let aldaataiToo = 0;


// ==========================================
// ЦАГ АГААРЫН ТОВЧ МЭДЭЭЛЭЛ АВАХ
// ==========================================

async function tsagAgaariinTovchMedeelelAvah(
    stationDugaar
) {

    const hariu =
        await retry(

            () =>
                axios.get(

                    `${tsagAgaariinApiUrl}/weather/summary`,

                    {
                        params: {

                            station:
                                stationDugaar

                        },

                        headers: {

                            "X-API-Key":
                                tsagAgaariinApiKey

                        },

                        timeout:
                            30000

                    }

                ),

            3,

            2000,

            odoogiinTsagAgaarLogger

        );


    return hariu.data;
}


// ==========================================
// ОДООГИЙН ЦАГ АГААР ХАДГАЛАХ
// ==========================================

async function odoogiinTsagAgaariigHadgalah(
    stationDugaar,
    odoogiinMedee
) {

    if (!odoogiinMedee) {

        odoogiinTsagAgaarLogger.warn(
            "⚠️ Одоогийн цаг агаарын мэдээлэл байхгүй"
        );

        return false;
    }


    try {

        const ajiglasanOgnoo =
            odoogiinMedee.timestamp
                ? new Date(
                    odoogiinMedee.timestamp
                )
                : new Date();


        const temperatur =
            odoogiinMedee.temperature?.value != null
                ? Number(
                    odoogiinMedee.temperature.value
                )
                : null;


        const medregdehTemperatur =
            odoogiinMedee.temperature?.feelsLike != null
                ? Number(
                    odoogiinMedee.temperature.feelsLike
                )
                : null;


        const chigleg =
            odoogiinMedee.humidity != null
                ? Number(
                    odoogiinMedee.humidity
                )
                : null;


        const daralt =
            odoogiinMedee.pressure != null
                ? Number(
                    odoogiinMedee.pressure
                )
                : null;


        const salhinyHurd =
            odoogiinMedee.windSpeed != null
                ? Number(
                    odoogiinMedee.windSpeed
                )
                : null;


        const salhinyDelbee =
            odoogiinMedee.windGust != null
                ? Number(
                    odoogiinMedee.windGust
                )
                : null;


        const hurTunadas =
            odoogiinMedee.precipitation != null
                ? Number(
                    odoogiinMedee.precipitation
                )
                : null;


        const uvIndex =
            odoogiinMedee.uvIndex != null
                ? Number(
                    odoogiinMedee.uvIndex
                )
                : null;


        const shuurdynTseg =
            odoogiinMedee.dewPoint != null
                ? Number(
                    odoogiinMedee.dewPoint
                )
                : null;


        const haragts =
            odoogiinMedee.visibility != null
                ? Number(
                    odoogiinMedee.visibility
                )
                : null;


        const uulshil =
            odoogiinMedee.cloudCover != null
                ? Number(
                    odoogiinMedee.cloudCover
                )
                : null;


        const salhinyChiglel =
            odoogiinMedee.windDirection ??
            null;


        const tsagAgaariinNohtsol =
            odoogiinMedee.condition ??
            null;


        const ehUrvalj =
            odoogiinMedee.source ??
            "summary";


        await prisma.$executeRaw`

            INSERT INTO odoogiin_tsag_agaar (

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

            )

            VALUES (

                ${stationDugaar},

                ${ajiglasanOgnoo},

                ${temperatur},

                ${medregdehTemperatur},

                ${chigleg},

                ${daralt},

                ${salhinyHurd},

                ${salhinyChiglel},

                ${salhinyDelbee},

                ${haragts},

                ${uulshil},

                ${tsagAgaariinNohtsol},

                ${hurTunadas},

                ${uvIndex},

                ${shuurdynTseg},

                ${ehUrvalj}

            )

        `;


        odoogiinTsagAgaarToo++;

        amjilttaiHadgalsanToo++;


        odoogiinTsagAgaarLogger.info(
            `🌡️ Одоогийн цаг агаар хадгаллаа: stants_dugaar=${stationDugaar}`
        );


        odoogiinTsagAgaarLogger.info(
            `🌡️ Температур: ${
                temperatur ?? "байхгүй"
            } °C`
        );


        odoogiinTsagAgaarLogger.info(
            `💧 Чийгшил: ${
                chigleg ?? "байхгүй"
            } %`
        );


        odoogiinTsagAgaarLogger.info(
            `💨 Салхи: ${
                salhinyHurd ?? "байхгүй"
            } m/s`
        );


        odoogiinTsagAgaarLogger.info(
            `🧭 Салхины чиглэл: ${
                salhinyChiglel ?? "байхгүй"
            }`
        );


        return true;


    } catch (aldaa) {

        aldaataiToo++;


        odoogiinTsagAgaarLogger.error(
            `❌ Одоогийн цаг агаар хадгалах алдаа: stants_dugaar=${stationDugaar}`
        );


        odoogiinTsagAgaarLogger.error(
            aldaa.stack ||
            aldaa.message
        );


        return false;
    }
}


// ==========================================
// УРЬДЧИЛСАН МЭДЭЭ ХАДГАЛАХ
// ==========================================

async function uridchilsanMedeeHadgalah(
    stationDugaar,
    uridchilsanMedee
) {

    if (
        !Array.isArray(
            uridchilsanMedee
        )
    ) {

        uridchilsanMedeeLogger.warn(
            "⚠️ Урьдчилсан мэдээ массив биш байна"
        );

        return;
    }


    let hadgalsanToo = 0;


    for (
        const negUdriinMedee
        of uridchilsanMedee
    ) {

        try {

            const temperaturMin =
                negUdriinMedee.night?.tempMin != null

                    ? Number(
                        negUdriinMedee.night.tempMin
                    )

                    : null;


            const temperaturMax =
                negUdriinMedee.day?.tempMax != null

                    ? Number(
                        negUdriinMedee.day.tempMax
                    )

                    : null;


            const nohtsol =
                negUdriinMedee.day?.condition ||
                negUdriinMedee.night?.condition ||
                null;


            const hurTunadasMagadlalt =
                negUdriinMedee.day?.precipProbability != null

                    ? Number(
                        negUdriinMedee.day.precipProbability
                    )

                    :

                    (
                        negUdriinMedee.night?.precipProbability != null

                            ? Number(
                                negUdriinMedee.night.precipProbability
                            )

                            : null
                    );


            const hurTunadas =
                negUdriinMedee.day?.precipAmount != null

                    ? Number(
                        negUdriinMedee.day.precipAmount
                    )

                    :

                    (
                        negUdriinMedee.night?.precipAmount != null

                            ? Number(
                                negUdriinMedee.night.precipAmount
                            )

                            : null
                    );


            const salhinyHurd =
                negUdriinMedee.day?.windSpeed != null

                    ? Number(
                        negUdriinMedee.day.windSpeed
                    )

                    :

                    (
                        negUdriinMedee.night?.windSpeed != null

                            ? Number(
                                negUdriinMedee.night.windSpeed
                            )

                            : null
                    );


            const garig =
                negUdriinMedee.dayOfWeek ??
                null;


            const narMandah =
                negUdriinMedee.sunrise ||
                null;


            const narJargah =
                negUdriinMedee.sunset ||
                null;


            await prisma.$executeRaw`

                INSERT INTO uridchilsan_medee (

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

                    eh_urvalj

                )

                VALUES (

                    ${stationDugaar},

                    ${negUdriinMedee.date},

                    ${garig},

                    ${temperaturMin},

                    ${temperaturMax},

                    ${nohtsol},

                    ${hurTunadasMagadlalt},

                    ${hurTunadas},

                    ${salhinyHurd},

                    ${null},

                    ${narMandah},

                    ${narJargah},

                    ${"summary"}

                )

                ON DUPLICATE KEY UPDATE

                    garig =
                        VALUES(garig),

                    temperatur_min_c =
                        VALUES(temperatur_min_c),

                    temperatur_max_c =
                        VALUES(temperatur_max_c),

                    nohtsol =
                        VALUES(nohtsol),

                    hur_tunadas_magadlalt_huvi =
                        VALUES(
                            hur_tunadas_magadlalt_huvi
                        ),

                    hur_tunadas_mm =
                        VALUES(
                            hur_tunadas_mm
                        ),

                    salhiny_hurd_ms =
                        VALUES(
                            salhiny_hurd_ms
                        ),

                    nar_mandah =
                        VALUES(
                            nar_mandah
                        ),

                    nar_jargah =
                        VALUES(
                            nar_jargah
                        ),

                    hadgalsan_ognoo =
                        CURRENT_TIMESTAMP

            `;


            hadgalsanToo++;

            amjilttaiHadgalsanToo++;


            uridchilsanMedeeLogger.info(
                `📅 ${hadgalsanToo}/${uridchilsanMedee.length} - ${negUdriinMedee.date}`
            );


        } catch (aldaa) {

            aldaataiToo++;


            uridchilsanMedeeLogger.error(
                `❌ Forecast хадгалах алдаа: stants_dugaar=${stationDugaar}, date=${negUdriinMedee.date}`
            );


            uridchilsanMedeeLogger.error(
                aldaa.stack ||
                aldaa.message
            );

        }

    }


    uridchilsanMedeeToo =
        hadgalsanToo;


    uridchilsanMedeeLogger.info(
        `📅 Урьдчилсан мэдээ: ${hadgalsanToo} өдөр хадгаллаа`
    );
}


// ==========================================
// ЦАГ АГААРЫН САНУУЛГА ХАДГАЛАХ
// ==========================================

async function tsagAgaariinSanuulgaHadgalah(
    sanuulguud
) {

    if (
        !Array.isArray(
            sanuulguud
        )
    ) {

        tsagAgaarSanuulgaLogger.warn(
            "⚠️ Цаг агаарын сануулга массив биш байна"
        );

        return;
    }


    let hadgalsanToo = 0;


    for (
        const sanuulga
        of sanuulguud
    ) {

        try {

            const noloolohBus =
                Array.isArray(
                    sanuulga.affectedAreas
                )

                    ? JSON.stringify(
                        sanuulga.affectedAreas
                    )

                    : null;


            const ehlehOgnoo =
                sanuulga.startTime

                    ? new Date(
                        sanuulga.startTime
                    )

                    : null;


            const duusahOgnoo =
                sanuulga.endTime

                    ? new Date(
                        sanuulga.endTime
                    )

                    : null;


            await prisma.$executeRaw`

                INSERT INTO tsag_agaar_sanuulga (

                    id,

                    turul,

                    hundrel,

                    garchig,

                    tailbar,

                    nolooloh_bus,

                    ehleh_ognoo,

                    duusah_ognoo,

                    idevhtei

                )

                VALUES (

                    ${String(sanuulga.id)},

                    ${sanuulga.type ?? null},

                    ${sanuulga.severity ?? null},

                    ${sanuulga.title ?? null},

                    ${sanuulga.description ?? null},

                    ${noloolohBus},

                    ${ehlehOgnoo},

                    ${duusahOgnoo},

                    ${sanuulga.isActive ? 1 : 0}

                )

                ON DUPLICATE KEY UPDATE

                    turul =
                        VALUES(turul),

                    hundrel =
                        VALUES(hundrel),

                    garchig =
                        VALUES(garchig),

                    tailbar =
                        VALUES(tailbar),

                    nolooloh_bus =
                        VALUES(nolooloh_bus),

                    ehleh_ognoo =
                        VALUES(ehleh_ognoo),

                    duusah_ognoo =
                        VALUES(duusah_ognoo),

                    idevhtei =
                        VALUES(idevhtei),

                    hadgalsan_ognoo =
                        CURRENT_TIMESTAMP

            `;


            hadgalsanToo++;

            amjilttaiHadgalsanToo++;


            tsagAgaarSanuulgaLogger.info(
                `⚠️ ${hadgalsanToo}/${sanuulguud.length} - ${sanuulga.title ?? sanuulga.id}`
            );


        } catch (aldaa) {

            aldaataiToo++;


            tsagAgaarSanuulgaLogger.error(
                `❌ Alert хадгалах алдаа: id=${sanuulga.id}`
            );


            tsagAgaarSanuulgaLogger.error(
                aldaa.stack ||
                aldaa.message
            );

        }

    }


    sanuulgaToo =
        hadgalsanToo;


    tsagAgaarSanuulgaLogger.info(
        `⚠️ Цаг агаарын сануулга: ${hadgalsanToo} хадгаллаа`
    );
}


// ==========================================
// АГААРЫН ЧАНАР ХАДГАЛАХ
// ==========================================

async function agaarChanariigHadgalah(
    stationDugaar,
    agaarChanar
) {

    if (!agaarChanar) {

        agaarChanarLogger.warn(
            "⚠️ Агаарын чанарын мэдээлэл байхгүй"
        );

        return;
    }


    try {

        const bohirduulagch =
            agaarChanar.pollutants ||
            {};


        const aqi =
            agaarChanar.aqi != null

                ? Number(
                    agaarChanar.aqi
                )

                : null;


        const angilal =
            agaarChanar.category ??
            null;


        const angilalMongol =
            agaarChanar.categoryMn ??
            null;


        const pm25 =
            bohirduulagch.pm25 != null

                ? Number(
                    bohirduulagch.pm25
                )

                : null;


        const pm10 =
            bohirduulagch.pm10 != null

                ? Number(
                    bohirduulagch.pm10
                )

                : null;


        const no2 =
            bohirduulagch.no2 != null

                ? Number(
                    bohirduulagch.no2
                )

                : null;


        const so2 =
            bohirduulagch.so2 != null

                ? Number(
                    bohirduulagch.so2
                )

                : null;


        const co =
            bohirduulagch.co != null

                ? Number(
                    bohirduulagch.co
                )

                : null;


        const o3 =
            bohirduulagch.o3 != null

                ? Number(
                    bohirduulagch.o3
                )

                : null;


        const eruulMendZuvlumj =
            agaarChanar.healthAdvice ??
            null;


        const shinechilsenOgnoo =
            agaarChanar.timestamp

                ? new Date(
                    agaarChanar.timestamp
                )

                : new Date();


        await prisma.$executeRaw`

            INSERT INTO agaar_chanar (

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

            )

            VALUES (

                ${stationDugaar},

                ${aqi},

                ${angilal},

                ${angilalMongol},

                ${pm25},

                ${pm10},

                ${no2},

                ${so2},

                ${co},

                ${o3},

                ${eruulMendZuvlumj},

                ${shinechilsenOgnoo}

            )

        `;


        agaarChanarToo++;

        amjilttaiHadgalsanToo++;


        agaarChanarLogger.info(
            `🌫️ Агаарын чанар хадгаллаа: stants_dugaar=${stationDugaar}, AQI=${aqi ?? "-"}`
        );


        agaarChanarLogger.info(
            `PM2.5=${pm25 ?? "-"} | PM10=${pm10 ?? "-"} | NO2=${no2 ?? "-"} | SO2=${so2 ?? "-"} | CO=${co ?? "-"} | O3=${o3 ?? "-"}`
        );


    } catch (aldaa) {

        aldaataiToo++;


        agaarChanarLogger.error(
            `❌ Агаарын чанар хадгалах алдаа: stants_dugaar=${stationDugaar}`
        );


        agaarChanarLogger.error(
            aldaa.stack ||
            aldaa.message
        );

    }
}


// ==========================================
// БҮХ ТОВЧ МЭДЭЭЛЛИЙГ ХАДГАЛАХ
// ==========================================

async function tovchMedeelelHadgalah() {

    const ehelsenTsag =
        Date.now();


    odoogiinTsagAgaarLogger.info(
        ""
    );

    odoogiinTsagAgaarLogger.info(
        "========================================"
    );

    odoogiinTsagAgaarLogger.info(
        "🌤️ ЦАГ АГААРЫН ТОВЧ МЭДЭЭЛЭЛ"
    );

    odoogiinTsagAgaarLogger.info(
        "========================================"
    );


    try {

        // ==========================================
        // API-ААС МЭДЭЭЛЭЛ АВАХ
        // ==========================================

        odoogiinTsagAgaarLogger.info(
            "📡 Weather Summary API дуудаж байна..."
        );


        const tovchMedeelel =
            await tsagAgaariinTovchMedeelelAvah(
                "292"
            );


        if (
            !tovchMedeelel?.success
        ) {

            throw new Error(
                "Weather Summary API success=false"
            );

        }


        odoogiinTsagAgaarLogger.info(
            "✅ API response амжилттай ирлээ"
        );


        // ==========================================
        // БОДИТ СТАНЦЫН ДУГААР
        // ==========================================

        if (
            !tovchMedeelel.station?.id
        ) {

            throw new Error(
                "API response дотор station.id олдсонгүй"
            );

        }


        const stationDugaar =
            String(
                tovchMedeelel.station.id
            );


        odoogiinTsagAgaarLogger.info(
            `📍 Станц: ${stationDugaar}`
        );


        odoogiinTsagAgaarLogger.info(
            `📍 Нэр: ${tovchMedeelel.station.name ?? "-"}`
        );


        odoogiinTsagAgaarLogger.info(
            `📍 Аймаг/хот: ${tovchMedeelel.station.aimag ?? "-"}`
        );


        // ==========================================
        // ОДООГИЙН ЦАГ АГААР
        // ==========================================

        odoogiinTsagAgaarLogger.info(
            "🌡️ Одоогийн цаг агаар хадгалж байна..."
        );


        await odoogiinTsagAgaariigHadgalah(

            stationDugaar,

            tovchMedeelel.data?.current

        );


        // ==========================================
        // УРЬДЧИЛСАН МЭДЭЭ
        // ==========================================

        uridchilsanMedeeLogger.info(
            "📅 Урьдчилсан мэдээ хадгалж байна..."
        );


        await uridchilsanMedeeHadgalah(

            stationDugaar,

            tovchMedeelel.data?.forecast

        );


        // ==========================================
        // САНУУЛГА
        // ==========================================

        tsagAgaarSanuulgaLogger.info(
            "⚠️ Цаг агаарын сануулга хадгалж байна..."
        );


        await tsagAgaariinSanuulgaHadgalah(

            tovchMedeelel.data?.alerts

        );


        // ==========================================
        // АГААРЫН ЧАНАР
        // ==========================================

        agaarChanarLogger.info(
            "🌫️ Агаарын чанар хадгалж байна..."
        );


        await agaarChanariigHadgalah(

            stationDugaar,

            tovchMedeelel.data?.airQuality

        );


        // ==========================================
        // ХУГАЦАА
        // ==========================================

        const duussanTsag =
            Date.now();


        const zartsuulsanHugatsaa =
            (
                (
                    duussanTsag -
                    ehelsenTsag
                ) /
                1000
            ).toFixed(2);


        // ==========================================
        // ЭЦСИЙН ҮР ДҮН
        // ==========================================

        odoogiinTsagAgaarLogger.info(
            ""
        );

        odoogiinTsagAgaarLogger.info(
            "========================================"
        );

        odoogiinTsagAgaarLogger.info(
            "📊 ЦАГ АГААРЫН IMPORT ҮР ДҮН"
        );

        odoogiinTsagAgaarLogger.info(
            "========================================"
        );


        odoogiinTsagAgaarLogger.info(
            `📡 Станц                     : ${stationDugaar}`
        );


        odoogiinTsagAgaarLogger.info(
            `🌡️ Одоогийн цаг агаар        : ${odoogiinTsagAgaarToo}`
        );


        uridchilsanMedeeLogger.info(
            `📅 Урьдчилсан мэдээ          : ${uridchilsanMedeeToo} өдөр`
        );


        tsagAgaarSanuulgaLogger.info(
            `⚠️ Цаг агаарын сануулга      : ${sanuulgaToo}`
        );


        agaarChanarLogger.info(
            `🌫️ Агаарын чанар             : ${agaarChanarToo}`
        );


        odoogiinTsagAgaarLogger.info(
            `💾 Нийт амжилттай хадгалсан  : ${amjilttaiHadgalsanToo}`
        );


        odoogiinTsagAgaarLogger.info(
            `❌ Нийт алдаа                : ${aldaataiToo}`
        );


        odoogiinTsagAgaarLogger.info(
            `⏱️ Зарцуулсан хугацаа        : ${zartsuulsanHugatsaa} секунд`
        );


        odoogiinTsagAgaarLogger.info(
            "========================================"
        );


        if (
            aldaataiToo === 0
        ) {

            odoogiinTsagAgaarLogger.info(
                "🎉 ЦАГ АГААРЫН IMPORT АМЖИЛТТАЙ ДУУСЛАА"
            );

        } else {

            odoogiinTsagAgaarLogger.warn(
                "⚠️ IMPORT ДУУССАН. Зарим мэдээлэлд алдаа гарлаа."
            );

        }


        odoogiinTsagAgaarLogger.info(
            "========================================"
        );


    } catch (aldaa) {

        aldaataiToo++;


        odoogiinTsagAgaarLogger.error(
            ""
        );


        odoogiinTsagAgaarLogger.error(
            "========================================"
        );


        odoogiinTsagAgaarLogger.error(
            "❌ ТОВЧ МЭДЭЭЛЭЛ IMPORT АЛДАА"
        );


        odoogiinTsagAgaarLogger.error(
            "========================================"
        );


        if (
            aldaa.response
        ) {

            odoogiinTsagAgaarLogger.error(
                `📡 HTTP Status: ${aldaa.response.status}`
            );


            odoogiinTsagAgaarLogger.error(
                `📄 API Data: ${JSON.stringify(
                    aldaa.response.data
                )}`
            );


        } else {

            odoogiinTsagAgaarLogger.error(
                aldaa.stack ||
                aldaa.message
            );

        }


    } finally {

        // ==========================================
        // PRISMA DISCONNECT
        // ==========================================

        try {

            await prisma.$disconnect();

            odoogiinTsagAgaarLogger.info(
                "🔌 MySQL холболт хаагдлаа"
            );

        } catch (disconnectError) {

            odoogiinTsagAgaarLogger.error(
                `❌ MySQL холболт хаах алдаа: ${
                    disconnectError.message
                }`
            );

        }

    }
}


// ==========================================
// ПРОГРАМ АЖИЛЛУУЛАХ
// ==========================================

tovchMedeelelHadgalah();