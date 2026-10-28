
import express from "express";

import {
    getAgaarChanar,
    getAgaarChanarByStation,
    getLatestAgaarChanar,
} from "../controllers/agaar-chanar.controller.js";

const router = express.Router();

// Бүх агаарын чанарын станц
// GET /weather_db/agaar_chanar
router.get("/", getAgaarChanar);

// Станцын хэмжилтийн түүх
// GET /weather_db/agaar_chanar/history/12401
router.get(
    "/history/:stants_dugaar",
    getAgaarChanarByStation
);

// Станцын хамгийн сүүлийн хэмжилт
// GET /weather_db/agaar_chanar/12401
router.get(
    "/:stants_dugaar",
    getLatestAgaarChanar
);

export default router;
