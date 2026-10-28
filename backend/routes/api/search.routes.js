import express from "express";

import {
    searchLocationsController
} from "../../controllers/api/search.controller.js";

const router = express.Router();

router.get(
    "/",
    searchLocationsController
);

export default router;