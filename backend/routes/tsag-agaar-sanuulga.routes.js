import express from "express";

import {
    getTsagAgaarSanuulga
} from "../controllers/tsag-agaar-sanuulga.controller.js";

const router = express.Router();

router.get(
    "/",
    getTsagAgaarSanuulga
);

export default router;