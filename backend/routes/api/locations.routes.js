import express from "express";

import {
    getLocationsController
} from "../../controllers/api/locations.controller.js";

const router = express.Router();

router.get(
    "/",
    getLocationsController
);

export default router;