
import {
    getCurrentWeatherByStation,
    getAllCurrentWeather,
    getHourlyWeatherByStation,
    getHistoryByStation,
} from "../services/tsag-agaar.service.js";

// =====================================================
// АЛДААНЫ ХАРИУ
// =====================================================

function sendError(res, error, message) {
    console.error(`[TSAG AGAAR ERROR] ${message}:`, error);

    const status =
        error?.message?.includes("Станц олдсонгүй") ? 404 :
        error?.message?.includes("шаардлагатай") ? 400 :
        500;

    return res.status(status).json({
        success: false,
        message:
            status === 500
                ? "Сервер дээр алдаа гарлаа."
                : error.message,
        ...(process.env.NODE_ENV !== "production" && status === 500
            ? { detail: error.message }
            : {}),
    });
}

// =====================================================
// ОДООГИЙН ЦАГ АГААР
// GET /weather_db/tsag_agaar/current?station=549
// =====================================================

export async function getCurrentWeather(req, res) {
    try {
        const station = String(req.query.station ?? "").trim();

        if (!station) {
            return res.status(400).json({
                success: false,
                message:
                    "station параметр шаардлагатай. Жишээ: ?station=549",
            });
        }

        const data = await getCurrentWeatherByStation(station);

        if (!data) {
            return res.status(404).json({
                success: false,
                message:
                    `${station} дугаартай станцын одоогийн цаг агаарын мэдээлэл олдсонгүй.`,
                station,
                data: null,
            });
        }

        return res.status(200).json({
            success: true,
            station,
            data,
        });
    } catch (error) {
        return sendError(res, error, "Одоогийн цаг агаар авах");
    }
}

// =====================================================
// БҮХ СТАНЦЫН ОДООГИЙН ЦАГ АГААР
// GET /weather_db/tsag_agaar/current/all
// =====================================================

export async function getAllWeather(req, res) {
    try {
        const data = await getAllCurrentWeather();

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        return sendError(res, error, "Бүх станцын цаг агаар авах");
    }
}

// =====================================================
// СОНГОСОН СТАНЦЫН ДАРААГИЙН 24 ЦАГИЙН МЭДЭЭ
// GET /weather_db/tsag_agaar/hourly/549
// =====================================================

export async function getHourlyWeather(req, res) {
    try {
        const station = String(req.params.station ?? "").trim();

        if (!station) {
            return res.status(400).json({
                success: false,
                message: "Станцын дугаар шаардлагатай.",
            });
        }

        const result = await getHourlyWeatherByStation(station);

        return res.status(200).json({
            success: true,
            station: result.station,
            timezone: result.timezone ?? "Asia/Ulaanbaatar",
            count: result.count,
            expectedCount: result.expectedCount ?? 24,
            complete: result.complete ?? result.count === 24,
            from_time: result.from_time,
            to_time: result.to_time,
            current_time: result.current_time,
            message: result.message,
            data: result.hourly,
        });
    } catch (error) {
        return sendError(res, error, "24 цагийн урьдчилсан мэдээ авах");
    }
}

// =====================================================
// ТҮҮХЭН ЦАГ АГААР
// GET /weather_db/tsag_agaar/history/549?hours=24
// =====================================================

export async function getHistoryWeather(req, res) {
    try {
        const station = String(req.params.station ?? "").trim();
        const hours = req.query.hours ?? 24;

        if (!station) {
            return res.status(400).json({
                success: false,
                message: "Станцын дугаар шаардлагатай.",
            });
        }

        const result = await getHistoryByStation(station, hours);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        return sendError(res, error, "Түүхэн цаг агаар авах");
    }
}
