import "dotenv/config";
import axios from "axios";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.ts";

// ==========================================
// MYSQL + PRISMA
// ==========================================

const adapter = new PrismaMariaDb({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "weather_db",
    connectionLimit: 5
});

const prisma = new PrismaClient({
    adapter
});

// ==========================================
// WEATHER API
// ==========================================

const WEATHER_API_URL = process.env.WEATHER_API_URL;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// ==========================================
// API-аас станцууд авах
// ==========================================

async function getStationsFromAPI() {

    console.log("=================================");
    console.log("🌤️ WEATHER STATIONS IMPORT");
    console.log("=================================");

    try {

        console.log("📡 API-аас станцуудыг авч байна...");

        const response = await axios.get(
            `${WEATHER_API_URL}/weather/stations`,
            {
                headers: {
                    "X-API-Key": WEATHER_API_KEY
                },
                timeout: 30000
            }
        );

        console.log("✅ API хүсэлт амжилттай");

        return response.data;

    } catch (error) {

        console.error("❌ API алдаа:");

        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }

        throw error;
    }
}

// ==========================================
// API response-оос station array авах
// ==========================================

function extractStations(apiResponse) {

    if (Array.isArray(apiResponse)) {
        return apiResponse;
    }

    if (Array.isArray(apiResponse?.data)) {
        return apiResponse.data;
    }

    if (Array.isArray(apiResponse?.stations)) {
        return apiResponse.stations;
    }

    if (Array.isArray(apiResponse?.data?.stations)) {
        return apiResponse.data.stations;
    }

    throw new Error(
        "API response дотроос station array олдсонгүй."
    );
}

// ==========================================
// Талбарын утга авах
// ==========================================

function getStationValue(station, ...keys) {

    for (const key of keys) {

        if (
            station[key] !== undefined &&
            station[key] !== null
        ) {
            return station[key];
        }
    }

    return null;
}

// ==========================================
// Бүх станцыг DB-д хадгалах
// ==========================================

async function saveStations() {

    try {

        // 1. API-аас станцууд авах
        const apiResponse =
            await getStationsFromAPI();

        console.log("📦 API response авлаа");

        // 2. Station array авах
        const stations =
            extractStations(apiResponse);

        console.log(
            `📊 Нийт ${stations.length} станц олдлоо`
        );

        let savedCount = 0;

        // 3. Бүх станцыг хадгалах
        for (const station of stations) {

            const stantsDugaar =
                getStationValue(
                    station,
                    "id",
                    "stationId",
                    "station_id",
                    "stants_dugaar"
                );

            const ner =
                getStationValue(
                    station,
                    "name",
                    "ner"
                );

            const nerEn =
                getStationValue(
                    station,
                    "nameEn",
                    "name_en",
                    "ner_en"
                );

            const aimag =
                getStationValue(
                    station,
                    "aimag",
                    "province",
                    "region"
                );

            const urgurug =
                getStationValue(
                    station,
                    "latitude",
                    "lat",
                    "urgurug"
                );

            const urtrag =
                getStationValue(
                    station,
                    "longitude",
                    "lng",
                    "lon",
                    "urtrag"
                );

            const undur =
                getStationValue(
                    station,
                    "elevation",
                    "altitude",
                    "height",
                    "undur"
                );

            // Station ID байхгүй бол алгасна
            if (!stantsDugaar) {

                console.log(
                    "⚠️ Station ID байхгүй тул алгаслаа:",
                    station
                );

                continue;
            }

            const stationName =
                ner ?? `Station ${stantsDugaar}`;

            // ==================================
            // UPSERT
            // Байгаа бол UPDATE
            // Байхгүй бол INSERT
            // ==================================

            await prisma.stantsuud.upsert({

                where: {
                    stantsDugaar:
                        String(stantsDugaar)
                },

                update: {

                    ner:
                        String(stationName),

                    nerEn:
                        nerEn !== null
                            ? String(nerEn)
                            : null,

                    aimag:
                        aimag !== null
                            ? String(aimag)
                            : null,

                    urgurug:
                        urgurug !== null
                            ? Number(urgurug)
                            : null,

                    urtrag:
                        urtrag !== null
                            ? Number(urtrag)
                            : null,

                    undur:
                        undur !== null
                            ? Number(undur)
                            : null
                },

                create: {

                    stantsDugaar:
                        String(stantsDugaar),

                    ner:
                        String(stationName),

                    nerEn:
                        nerEn !== null
                            ? String(nerEn)
                            : null,

                    aimag:
                        aimag !== null
                            ? String(aimag)
                            : null,

                    urgurug:
                        urgurug !== null
                            ? Number(urgurug)
                            : null,

                    urtrag:
                        urtrag !== null
                            ? Number(urtrag)
                            : null,

                    undur:
                        undur !== null
                            ? Number(undur)
                            : null
                }
            });

            savedCount++;

            console.log(
                `✅ ${savedCount}/${stations.length} - ${stantsDugaar} - ${stationName}`
            );
        }

        console.log("");
        console.log("=================================");
        console.log("🎉 IMPORT ДУУСЛАА");
        console.log("=================================");
        console.log(
            `📊 API station: ${stations.length}`
        );
        console.log(
            `💾 DB-д хадгалсан: ${savedCount}`
        );

    } catch (error) {

        console.error("");
        console.error("❌ IMPORT АЛДАА:");
        console.error(error);

    } finally {

        await prisma.$disconnect();

    }
}

// ==========================================
// START
// ==========================================

saveStations();