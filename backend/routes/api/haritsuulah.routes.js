import express from "express";

import {
    haritsuulahController
} from "../../controllers/api/haritsuulah.controller.js";


const router = express.Router();


router.get(
    "/",
    haritsuulahController
);


export default router;