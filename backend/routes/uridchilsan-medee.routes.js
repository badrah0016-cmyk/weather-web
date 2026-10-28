import express from "express";

import {
    getForecast
} from "../controllers/uridchilsan-medee.controller.js";


const router =
    express.Router();


router.get(
    "/",
    getForecast
);


export default router;