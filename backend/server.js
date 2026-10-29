import "dotenv/config";

import express from "express";
import cors from "cors";

import prisma from "./prisma.js";
import config from "./config.js";


// =====================================================
// SWAGGER
// =====================================================

import {
    swaggerSpec,
    swaggerUi
} from "./swagger.js";


// =====================================================
// CRON SCHEDULER
// =====================================================

// CRON SCHEDULER
// Local орчинд cron ажиллана.
// Vercel дээр байнгын cron процесс ажиллуулахгүй.

if (process.env.VERCEL !== "1") {
    await import("./cron.js");
}


// =====================================================
// ROUTES
// =====================================================

import rootRoutes
    from "./routes/root.routes.js";

import stantsuudRoutes
    from "./routes/stantsuud.routes.js";

import tsagAgaarRoutes
    from "./routes/tsag-agaar.routes.js";

import uridchilsanMedeeRoutes
    from "./routes/uridchilsan-medee.routes.js";

import tsagAgaarSanuulgaRoutes
    from "./routes/tsag-agaar-sanuulga.routes.js";

import agaarChanarRoutes
    from "./routes/agaar-chanar.routes.js";

import golUsHydrologyRoutes
    from "./routes/gol-us-hydrology.routes.js";

import weatherRoutes
    from "./routes/weather.routes.js";


// =====================================================
// API ROUTES
// =====================================================

import locationsRoutes
    from "./routes/api/locations.routes.js";

import searchRoutes
    from "./routes/api/search.routes.js";

import haritsuulahRoutes
    from "./routes/api/haritsuulah.routes.js";

import uzuuleltRoutes
    from "./routes/api/uzuulelt.routes.js";


// =====================================================
// EXPRESS SERVER
// =====================================================

const app = express();

const PORT =
    config.server.port || 4000;


// =====================================================
// CORS
// =====================================================

app.use(
    cors({

        origin:
            config.cors.origin ||
            config.frontend.url,

        methods:
            config.cors.methods,

        allowedHeaders:
            config.cors.allowedHeaders

    })
);


// =====================================================
// JSON BODY
// =====================================================

app.use(
    express.json({

        limit: "1mb"

    })
);


// =====================================================
// ROOT ROUTE
// =====================================================

app.use(
    "/",
    rootRoutes
);


// =====================================================
// DATABASE HEALTH CHECK
// =====================================================

app.get(
    "/api/health",

    async (req, res) => {

        try {

            const result =
                await prisma.$queryRaw`

                    SELECT
                        DATABASE()
                        AS database_name

                `;


            return res.status(200).json({

                success: true,

                status: "connected",

                database:
                    result[0].database_name

            });

        } catch (error) {

            console.error(
                "❌ Database health error:"
            );

            console.error(error);


            return res.status(500).json({

                success: false,

                status: "disconnected",

                message:
                    "Database холболтын алдаа",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// API - LOCATIONS
// =====================================================

app.use(
    "/api/locations",
    locationsRoutes
);


// =====================================================
// API - SEARCH
// =====================================================

app.use(
    "/api/search",
    searchRoutes
);


// =====================================================
// API - HARITSUULAH
// =====================================================

app.use(
    "/api/weather/haritsuulah",
    haritsuulahRoutes
);


// =====================================================
// API - UZUUELT
// =====================================================

app.use(
    "/api/weather/uzuulelt",
    uzuuleltRoutes
);


// =====================================================
// 1. СТАНЦУУД
// =====================================================

app.use(
    "/weather_db/stantsuud",
    stantsuudRoutes
);


// =====================================================
// 2. ЦАГ АГААР
// =====================================================

app.use(
    "/weather_db/tsag_agaar",
    tsagAgaarRoutes
);


// =====================================================
// 3. УРЬДЧИЛСАН МЭДЭЭ
// =====================================================

app.use(
    "/weather_db/uridchilsan_medee",
    uridchilsanMedeeRoutes
);


// =====================================================
// 4. ЦАГ АГААРЫН САНУУЛГА
// =====================================================

app.use(
    "/weather_db/tsag_agaar_sanuulga",
    tsagAgaarSanuulgaRoutes
);


// =====================================================
// 5. АГААРЫН ЧАНАР
// =====================================================

app.use(
    "/weather_db/agaar_chanar",
    agaarChanarRoutes
);


// =====================================================
// 6. ГОЛ УС / HYDROLOGY
// =====================================================

app.use(
    "/weather_db/gol_us_hydrology",
    golUsHydrologyRoutes
);


// =====================================================
// 7. НЭГТГЭСЭН WEATHER
// =====================================================

app.use(
    "/weather_db/weather",
    weatherRoutes
);


// =====================================================
// SWAGGER API DOCUMENTATION
// =====================================================

app.use(
    "/api-docs",

    swaggerUi.serve,

    swaggerUi.setup(
        swaggerSpec
    )
);


// =====================================================
// 404 ROUTE
// =====================================================

app.use(
    (req, res) => {

        return res.status(404).json({

            success: false,

            message:
                "API endpoint олдсонгүй",

            method:
                req.method,

            path:
                req.originalUrl

        });

    }
);


// =====================================================
// SERVER START FUNCTION
// =====================================================

async function startServer() {

    try {

        // =============================================
        // 1. DATABASE CONNECT
        // =============================================

        await prisma.$connect();


        // =============================================
        // 2. DATABASE CHECK
        // =============================================

        const database =
            await prisma.$queryRaw`

                SELECT
                    DATABASE()
                    AS database_name

            `;


        // =============================================
        // 3. SERVER INFORMATION
        // =============================================

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "🚀 WEATHER NODE.JS DATABASE API"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "✅ MySQL холболт амжилттай"
        );

        console.log(
            "📦 Database:",
            database[0].database_name
        );

        console.log(
            `🌐 Server: http://localhost:${PORT}`
        );

        console.log(
            "=========================================="
        );


        // =============================================
        // API URL
        // =============================================

        console.log("");

        console.log(
            "📡 DATABASE API URL"
        );

        console.log(
            "------------------------------------------"
        );


        // =============================================
        // STANTSUUD
        // =============================================

        console.log("");

        console.log(
            "🏢 СТАНЦУУД"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/stantsuud`
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/stantsuud/549`
        );


        // =============================================
        // CURRENT WEATHER
        // =============================================

        console.log("");

        console.log(
            "🌤️ ОДООГИЙН ЦАГ АГААР"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/tsag_agaar`
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/tsag_agaar/current?station=549`
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/tsag_agaar/current/all`
        );


        // =============================================
        // HOURLY WEATHER
        // =============================================

        console.log("");

        console.log(
            "🕐 ЦАГИЙН ЦАГ АГААР"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/tsag_agaar/hourly/549`
        );


        // =============================================
        // FORECAST
        // =============================================

        console.log("");

        console.log(
            "🔮 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/uridchilsan_medee`
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/uridchilsan_medee?stants_dugaar=549`
        );


        // =============================================
        // САНУУЛГА
        // =============================================

        console.log("");

        console.log(
            "⚠️ ЦАГ АГААРЫН САНУУЛГА"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/tsag_agaar_sanuulga`
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/tsag_agaar_sanuulga?active=true`
        );


        // =============================================
        // АГААРЫН ЧАНАР
        // =============================================

      // =============================================
// АГААРЫН ЧАНАР
// =============================================

console.log("");

console.log("🌫️ АГААРЫН ЧАНАР");

console.log(
    `GET http://localhost:${PORT}/weather_db/agaar_chanar`
);

console.log(
    `GET http://localhost:${PORT}/weather_db/agaar_chanar/12401`
);

console.log(
    `GET http://localhost:${PORT}/weather_db/agaar_chanar/history/12401`
);


        // =============================================
        // ГОЛ УС
        // =============================================

        console.log("");

        console.log(
            "🌊 ГОЛ УС / HYDROLOGY"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/gol_us_hydrology`
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/gol_us_hydrology/1`
        );


        // =============================================
        // WEATHER
        // =============================================

        console.log("");

        console.log(
            "🌦️ НЭГТГЭСЭН WEATHER"
        );

        console.log(
            `GET http://localhost:${PORT}/weather_db/weather?stants_dugaar=549`
        );


        // =============================================
        // LOCATIONS
        // =============================================

        console.log("");

        console.log(
            "📍 LOCATIONS"
        );

        console.log(
            `GET http://localhost:${PORT}/api/locations`
        );


        // =============================================
        // SEARCH
        // =============================================

        console.log("");

        console.log(
            "🔎 SEARCH"
        );

        console.log(
            `GET http://localhost:${PORT}/api/search?q=Цэцэрлэг`
        );

        console.log(
            `GET http://localhost:${PORT}/api/search?q=Архангай`
        );


        // =============================================
        // HARITSUULAH
        // =============================================

        console.log("");

        console.log(
            "⚖️ ХАРЬЦУУЛАХ"
        );

        console.log(
            `GET http://localhost:${PORT}/api/weather/haritsuulah?stations=549,610`
        );

        console.log(
            `GET http://localhost:${PORT}/api/weather/haritsuulah?stations=549,610,488`
        );


        // =============================================
        // UZUUELT
        // =============================================

        console.log("");

        console.log(
            "📊 ҮЗҮҮЛЭЛТ"
        );

        console.log(
            `GET http://localhost:${PORT}/api/weather/uzuulelt?station=549`
        );


        // =============================================
        // HEALTH
        // =============================================

        console.log("");

        console.log(
            "❤️ HEALTH"
        );

        console.log(
            `GET http://localhost:${PORT}/api/health`
        );


        // =============================================
        // SWAGGER
        // =============================================

        console.log("");

        console.log(
            "📚 SWAGGER"
        );

        console.log(
            `http://localhost:${PORT}/api-docs`
        );


        console.log(
            "------------------------------------------"
        );


        // =============================================
        // START EXPRESS
        // =============================================

        app.listen(

            PORT,

            () => {

                console.log("");

                console.log(
                    "=========================================="
                );

                console.log(
                    `🚀 Server ажиллаж байна: http://localhost:${PORT}`
                );

                console.log(
                    "=========================================="
                );


                // =====================================
                // BACKEND
                // =====================================

                console.log("");

                console.log(
                    "🔐 Backend:"
                );

                console.log(
                    "GET → зөвшөөрөгдөнө"
                );

                console.log(
                    "POST / PUT / DELETE → route-ийн тохиргооноос хамаарна"
                );


                // =====================================
                // FRONTEND
                // =====================================

                console.log("");

                console.log(
                    "🌐 Frontend:"
                );

                console.log(
                    config.frontend.url
                );


                // =====================================
                // SWAGGER
                // =====================================

                console.log("");

                console.log(
                    "📚 Swagger API Documentation:"
                );

                console.log(
                    `http://localhost:${PORT}/api-docs`
                );


                // =====================================
                // CRON
                // =====================================

                console.log("");

                console.log(
                    "⏰ Cron Scheduler:"
                );

                console.log(
                    "------------------------------------------"
                );

                console.log(
                    "12:05"
                );

                console.log(
                    "12:06→ хоногийн урьдчилсан мэдээ"
                );

                console.log(
                    "12:07 → Цаг агаарын сануулга"
                );

                console.log(
                    "12:08 → Гол усны гидрологи"
                );

                console.log(
                    "12:09 → Агаарын чанар"
                );

                console.log(
                    "------------------------------------------"
                );

                console.log(
                    "🌏 Timezone: Asia/Ulaanbaatar"
                );

                console.log("");

            }

        );

    } catch (error) {

        console.error("");

        console.error(
            "=========================================="
        );

        console.error(
            "❌ SERVER START ERROR"
        );

        console.error(
            "=========================================="
        );

        console.error(error);

        console.error("");

        process.exit(1);

    }

}


// =====================================================
// EXPORT EXPRESS APP FOR VERCEL
// =====================================================

export default app;


// =====================================================
// START APPLICATION LOCALLY ONLY
// =====================================================

if (process.env.VERCEL !== "1") {
    startServer();
}