
import {
    getAllAgaarChanar,
    getAgaarChanarByStation as getAgaarChanarByStationService,
    getLatestAgaarChanarByStation,
} from "../services/agaar-chanar.service.js";

import { agaarChanarLogger } from "../utils/logger.js";

// =====================================================
// BIGINT УТГЫГ JSON-Д ТОХИРУУЛАХ
// =====================================================

function serializeData(value) {
    return JSON.parse(
        JSON.stringify(value, (_, item) => {
            if (typeof item === "bigint") {
                return item.toString();
            }

            return item;
        })
    );
}

// =====================================================
// АЛДААНЫ ХАРИУ
// =====================================================

function handleServerError(res, message, error) {
    const errorMessage =
        error?.message ?? "Тодорхойгүй алдаа";

    agaarChanarLogger.error(
        `${message}: ${errorMessage}`
    );

    console.error(message, error);

    return res.status(500).json({
        success: false,
        message,
        error: errorMessage,
    });
}

// =====================================================
// GET /weather_db/agaar_chanar
// БҮХ СТАНЦЫН МЭДЭЭЛЭЛ
// =====================================================

export async function getAgaarChanar(req, res) {
    try {
        const result = await getAllAgaarChanar();
        const data = serializeData(result);

        agaarChanarLogger.info(
            `Бүх агаарын чанарын станцын мэдээлэл: ${data.length} мөр`
        );

        return res.json({
            success: true,
            database: "weather_db",
            table: "agaar_chanar_api",
            stations_table: "agaar_chanar_stantsuud",
            station_id_type: "air_quality_sid",
            stants_dugaar: "all",
            count: data.length,
            data,
        });
    } catch (error) {
        return handleServerError(
            res,
            "Бүх станцын агаарын чанар авах алдаа",
            error
        );
    }
}

// =====================================================
// GET /weather_db/agaar_chanar/history/:stants_dugaar
// СТАНЦЫН ХЭМЖИЛТИЙН ТҮҮХ
// =====================================================

export async function getAgaarChanarByStation(
    req,
    res
) {
    const stationSid = String(
        req.params.stants_dugaar ?? ""
    ).trim();

    if (!/^\d+$/.test(stationSid)) {
        return res.status(400).json({
            success: false,
            message: "Агаарын чанарын станцын SID буруу байна.",
        });
    }

    try {
        const result =
            await getAgaarChanarByStationService(
                stationSid
            );

        const data = serializeData(result);

        return res.json({
            success: true,
            database: "weather_db",
            table: "agaar_chanar_api",
            station_sid: stationSid,
            count: data.length,
            data,
        });
    } catch (error) {
        return handleServerError(
            res,
            `SID=${stationSid} станцын хэмжилтийн түүх авах алдаа`,
            error
        );
    }
}

// =====================================================
// GET /weather_db/agaar_chanar/:stants_dugaar
// СТАНЦЫН ХАМГИЙН СҮҮЛИЙН ХЭМЖИЛТ
// =====================================================

export async function getLatestAgaarChanar(
    req,
    res
) {
    const stationSid = String(
        req.params.stants_dugaar ?? ""
    ).trim();

    if (!/^\d+$/.test(stationSid)) {
        return res.status(400).json({
            success: false,
            message: "Агаарын чанарын станцын SID буруу байна.",
        });
    }

    try {
        const result =
            await getLatestAgaarChanarByStation(
                stationSid
            );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Агаарын чанарын станц олдсонгүй.",
                station_sid: stationSid,
            });
        }

        const data = serializeData(result);

        agaarChanarLogger.info(
            `Сүүлийн хэмжилт: SID=${stationSid}`
        );

        // Станц байгаа ч хэмжилтийн мэдээлэлгүй үед
        if (data.id == null) {
            return res.json({
                success: true,
                database: "weather_db",
                table: "agaar_chanar_api",
                station_sid: stationSid,
                has_measurement: false,
                count: 0,
                data,
            });
        }

        return res.json({
            success: true,
            database: "weather_db",
            table: "agaar_chanar_api",
            station_sid: stationSid,
            has_measurement: true,
            count: 1,
            data,
        });
    } catch (error) {
        return handleServerError(
            res,
            `SID=${stationSid} станцын сүүлийн агаарын чанар авах алдаа`,
            error
        );
    }
}
