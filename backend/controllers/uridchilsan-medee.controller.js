
import {
    getForecastByStation
} from "../services/uridchilsan-medee.service.js";

// ======================================================
// 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ
// ======================================================

export async function getForecast(req, res) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    try {
        const station = String(
            req.query.stants_dugaar ?? ""
        ).trim();

        if (!station) {
            return res.status(400).json({
                success: false,
                message: "stants_dugaar параметр оруулна уу."
            });
        }

        if (!/^\d+$/.test(station)) {
            return res.status(400).json({
                success: false,
                message: "Станцын дугаар зөвхөн тоо байх ёстой."
            });
        }

        console.log("========================================");
        console.log("FORECAST CONTROLLER");
        console.log("Station:", station);

        const forecast = await getForecastByStation(station);

        console.log("Returned rows:", forecast.length);
        console.log(
            "Returned dates:",
            forecast.map((item) => item.ognoo)
        );
        console.log("========================================");

        return res.status(200).json({
            success: true,
            count: forecast.length,
            data: forecast
        });

    } catch (error) {
        console.error("========================================");
        console.error("FORECAST ERROR");
        console.error("Name:", error.name);
        console.error("Code:", error.code ?? "N/A");
        console.error("Message:", error.message);
        console.error("Meta:", error.meta ?? "N/A");
        console.error("========================================");

        return res.status(500).json({
            success: false,
            message: "Урьдчилсан мэдээ авахад алдаа гарлаа.",
            error: error.message,
            code: error.code ?? null
        });
    }
}
