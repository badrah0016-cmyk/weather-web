import express from "express";
import config from "../config.js";

const router = express.Router();

router.get("/", (req, res) => {

    res.json({
        success: true,

        message:
            "Weather Database API ажиллаж байна!",

        database:
            config.database.name,

        server:
            `http://localhost:${config.server.port}`
    });

});

export default router;