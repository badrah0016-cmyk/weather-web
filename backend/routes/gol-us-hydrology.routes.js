import express from "express";

import {
    getGolUsHydrology,
    getGolUsHydrologyById
} from "../controllers/gol-us-hydrology.controller.js";

const router = express.Router();


// Бүх гол усны мэдээлэл
router.get(
    "/",
    getGolUsHydrology
);


// Нэг гол усны мэдээлэл
router.get(
    "/:id",
    getGolUsHydrologyById
);

export default router;