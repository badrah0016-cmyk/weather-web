import express from "express";

import {
    getUzuuleltController
} from "../../controllers/api/uzuulelt.controller.js";

const router =
    express.Router();

router.get(
    "/",
    getUzuuleltController
);

export default router;