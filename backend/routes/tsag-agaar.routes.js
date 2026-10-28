import express from "express";

import {
    getCurrentWeather,
    getAllWeather,
    getHourlyWeather,
} from "../controllers/tsag-agaar.controller.js";

const router = express.Router();

// =====================================================
// ОДООГИЙН ЦАГ АГААР
// GET /weather_db/tsag_agaar/current?station=549
// =====================================================
router.get("/current", getCurrentWeather);

// =====================================================
// БҮХ СТАНЦЫН ОДООГИЙН ЦАГ АГААР
// GET /weather_db/tsag_agaar/current/all
// =====================================================
router.get("/current/all", getAllWeather);

// =====================================================
// СОНГОСОН СТАНЦЫН ОЙРЫН 48 ЦАГИЙН МЭДЭЭ
// GET /weather_db/tsag_agaar/hourly/549
// =====================================================
router.get("/hourly/:station", getHourlyWeather);

export default router;