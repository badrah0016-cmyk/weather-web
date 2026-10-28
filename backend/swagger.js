import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Weather Web API",
            version: "1.0.0",
            description:
                "Цаг агаарын веб системийн Backend API документаци",
            contact: {
                name: "Weather Web Development Team"
            }
        },

        servers: [
            {
                url: "http://localhost:4000",
                description: "Local development server"
            }
        ],

        tags: [
            {
                name: "Систем",
                description: "Системийн үндсэн endpoint"
            },
            {
                name: "Станцууд",
                description: "Цаг агаарын станцуудын мэдээлэл"
            },
            {
                name: "Одоогийн цаг агаар",
                description: "Одоогийн цаг агаарын мэдээлэл"
            },
            {
                name: "Урьдчилсан мэдээ",
                description: "7 хоногийн урьдчилсан мэдээ"
            },
            {
                name: "Цаг агаарын сануулга",
                description: "Цаг агаарын сэрэмжлүүлэг"
            },
            {
                name: "Агаарын чанар",
                description: "Агаарын чанарын мэдээлэл"
            },
            {
                name: "Гол ус",
                description: "Гол усны гидрологийн мэдээлэл"
            },
            {
                name: "Нэгдсэн Weather",
                description: "Нэгдсэн цаг агаарын мэдээлэл"
            }
        ],

        paths: {

            // ==================================================
            // 1. СТАНЦУУД
            // ==================================================

            "/weather__db/stantsuud": {
                get: {
                    tags: ["Станцууд"],
                    summary: "Бүх цаг агаарын станц авах",
                    description:
                        "Өгөгдлийн сан дахь бүх цаг агаарын станцын мэдээллийг авна.",

                    responses: {
                        200: {
                            description:
                                "Станцуудын жагсаалт амжилттай авсан",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            count: {
                                                type: "integer",
                                                example: 321
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref:
                                                        "#/components/schemas/Station"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },

            "/weather__db/stantsuud/{stants_dugaar}": {
                get: {
                    tags: ["Станцууд"],
                    summary: "Нэг станцын мэдээлэл авах",
                    description:
                        "Станцын дугаараар тухайн станцын мэдээллийг авна.",

                    parameters: [
                        {
                            in: "path",
                            name: "stants_dugaar",
                            required: true,
                            description:
                                "Цаг агаарын станцын дугаар",
                            schema: {
                                type: "string"
                            },
                            example: "549"
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Станцын мэдээлэл амжилттай авсан",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                $ref:
                                                    "#/components/schemas/Station"
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        400: {
                            $ref:
                                "#/components/responses/BadRequest"
                        },

                        404: {
                            $ref:
                                "#/components/responses/NotFound"
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },


            // ==================================================
            // 2. ОДООГИЙН ЦАГ АГААР
            // ==================================================

            "/weather__db/odoogiin_tsag_agaar": {
                get: {
                    tags: ["Одоогийн цаг агаар"],
                    summary: "Бүх одоогийн цаг агаарын мэдээлэл авах",
                    description:
                        "Өгөгдлийн сан дахь одоогийн цаг агаарын бүх мэдээллийг авна.",

                    responses: {
                        200: {
                            description:
                                "Одоогийн цаг агаарын мэдээлэл",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            count: {
                                                type: "integer",
                                                example: 321
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref:
                                                        "#/components/schemas/CurrentWeather"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },

            "/weather__db/odoogiin_tsag_agaar/{stants_dugaar}": {
                get: {
                    tags: ["Одоогийн цаг агаар"],
                    summary: "Станцын одоогийн цаг агаар авах",
                    description:
                        "Станцын дугаараар тухайн станцын хамгийн сүүлийн цаг агаарын мэдээллийг авна.",

                    parameters: [
                        {
                            in: "path",
                            name: "stants_dugaar",
                            required: true,
                            description:
                                "Цаг агаарын станцын дугаар",
                            schema: {
                                type: "string"
                            },
                            example: "549"
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Одоогийн цаг агаарын мэдээлэл",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                $ref:
                                                    "#/components/schemas/CurrentWeather"
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        400: {
                            $ref:
                                "#/components/responses/BadRequest"
                        },

                        404: {
                            $ref:
                                "#/components/responses/NotFound"
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },


            // ==================================================
            // 3. 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ
            // ==================================================

            "/weather__db/uridchilsan_medee": {
                get: {
                    tags: ["Урьдчилсан мэдээ"],
                    summary: "Урьдчилсан мэдээ авах",
                    description:
                        "Бүх станцын эсвэл stants_dugaar параметрээр сонгосон станцын урьдчилсан мэдээг авна.",

                    parameters: [
                        {
                            in: "query",
                            name: "stants_dugaar",
                            required: false,
                            description:
                                "Станцын дугаар. Жишээ нь 549",
                            schema: {
                                type: "string"
                            },
                            example: "549"
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Урьдчилсан мэдээ амжилттай авсан",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            count: {
                                                type: "integer",
                                                example: 7
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref:
                                                        "#/components/schemas/Forecast"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        400: {
                            $ref:
                                "#/components/responses/BadRequest"
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },


            // ==================================================
            // 4. ЦАГ АГААРЫН САНУУЛГА
            // ==================================================

            "/weather__db/tsag_agaar_sanuulga": {
                get: {
                    tags: ["Цаг агаарын сануулга"],
                    summary: "Цаг агаарын сануулга авах",
                    description:
                        "Цаг агаарын сэрэмжлүүлэг болон сануулгын мэдээллийг авна.",

                    parameters: [
                        {
                            in: "query",
                            name: "active",
                            required: false,
                            description:
                                "true бол зөвхөн идэвхтэй сануулгыг авна",
                            schema: {
                                type: "boolean"
                            },
                            example: true
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Цаг агаарын сануулга",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            count: {
                                                type: "integer",
                                                example: 2
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref:
                                                        "#/components/schemas/WeatherAlert"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },


            // ==================================================
            // 5. АГААРЫН ЧАНАР
            // ==================================================

            "/weather__db/agaar_chanar": {
                get: {
                    tags: ["Агаарын чанар"],
                    summary: "Агаарын чанарын мэдээлэл авах",
                    description:
                        "Бүх станцын эсвэл stants_dugaar параметрээр сонгосон станцын агаарын чанарын мэдээллийг авна.",

                    parameters: [
                        {
                            in: "query",
                            name: "stants_dugaar",
                            required: false,
                            description:
                                "Агаарын чанарын станцтай холбоотой цаг агаарын станцын дугаар",
                            schema: {
                                type: "string"
                            },
                            example: "549"
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Агаарын чанарын мэдээлэл",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            count: {
                                                type: "integer",
                                                example: 321
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref:
                                                        "#/components/schemas/AirQuality"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },


            // ==================================================
            // 6. ГОЛ УСНЫ ГИДРОЛОГИ
            // ==================================================

            "/weather__db/gol_us_hydrology": {
                get: {
                    tags: ["Гол ус"],
                    summary: "Бүх гол усны гидрологийн мэдээлэл авах",
                    description:
                        "Өгөгдлийн сан дахь гол усны гидрологийн мэдээллийг авна.",

                    responses: {
                        200: {
                            description:
                                "Гол усны мэдээлэл",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            count: {
                                                type: "integer",
                                                example: 50
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref:
                                                        "#/components/schemas/Hydrology"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },

            "/weather__db/gol_us_hydrology/{id}": {
                get: {
                    tags: ["Гол ус"],
                    summary: "Нэг гол усны мэдээлэл авах",
                    description:
                        "ID дугаараар нэг гол усны гидрологийн мэдээллийг авна.",

                    parameters: [
                        {
                            in: "path",
                            name: "id",
                            required: true,
                            description:
                                "Гол усны мэдээллийн ID",
                            schema: {
                                type: "string"
                            },
                            example: "1"
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Гол усны мэдээлэл",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                $ref:
                                                    "#/components/schemas/Hydrology"
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        404: {
                            $ref:
                                "#/components/responses/NotFound"
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            },


            // ==================================================
            // 7. НЭГДСЭН WEATHER
            // ==================================================

            "/weather__db/weather": {
                get: {
                    tags: ["Нэгдсэн Weather"],
                    summary: "Нэгдсэн цаг агаарын мэдээлэл авах",
                    description:
                        "Станцын мэдээлэл, одоогийн цаг агаар, агаарын чанар болон урьдчилсан мэдээг нэг хариунд нэгтгэн буцаана.",

                    parameters: [
                        {
                            in: "query",
                            name: "stants_dugaar",
                            required: true,
                            description:
                                "Цаг агаарын станцын дугаар",
                            schema: {
                                type: "string"
                            },
                            example: "549"
                        }
                    ],

                    responses: {
                        200: {
                            description:
                                "Нэгдсэн цаг агаарын мэдээлэл",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                type: "object",
                                                properties: {
                                                    station: {
                                                        $ref:
                                                            "#/components/schemas/Station"
                                                    },
                                                    currentWeather: {
                                                        $ref:
                                                            "#/components/schemas/CurrentWeather"
                                                    },
                                                    airQuality: {
                                                        $ref:
                                                            "#/components/schemas/AirQuality"
                                                    },
                                                    forecast: {
                                                        type: "array",
                                                        items: {
                                                            $ref:
                                                                "#/components/schemas/Forecast"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },

                        400: {
                            $ref:
                                "#/components/responses/BadRequest"
                        },

                        404: {
                            $ref:
                                "#/components/responses/NotFound"
                        },

                        500: {
                            $ref:
                                "#/components/responses/ServerError"
                        }
                    }
                }
            }
        },


        // ======================================================
        // COMPONENTS
        // ======================================================

        components: {

            // ==================================================
            // SECURITY
            // ==================================================

            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description:
                        "JWT token ашиглан API-д хандана."
                }
            },


            // ==================================================
            // COMMON RESPONSES
            // ==================================================

            responses: {

                BadRequest: {
                    description:
                        "Хүсэлтийн параметр буруу байна",
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/ErrorResponse"
                            }
                        }
                    }
                },

                NotFound: {
                    description:
                        "Өгөгдөл олдсонгүй",
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/ErrorResponse"
                            }
                        }
                    }
                },

                ServerError: {
                    description:
                        "Серверийн дотоод алдаа",
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/ErrorResponse"
                            }
                        }
                    }
                }
            },


            // ==================================================
            // SCHEMAS
            // ==================================================

            schemas: {

                // ----------------------------------------------
                // ERROR
                // ----------------------------------------------

                ErrorResponse: {
                    type: "object",

                    properties: {

                        success: {
                            type: "boolean",
                            example: false
                        },

                        message: {
                            type: "string",
                            example:
                                "Өгөгдөл олдсонгүй"
                        },

                        error: {
                            type: "string",
                            example:
                                "Database error"
                        }
                    }
                },


                // ----------------------------------------------
                // STATION
                // ----------------------------------------------

                Station: {
                    type: "object",

                    properties: {

                        stants_dugaar: {
                            type: "string",
                            description:
                                "Цаг агаарын станцын дугаар",
                            example: "549"
                        },

                        ner: {
                            type: "string",
                            description:
                                "Станцын нэр",
                            example:
                                "Улаанбаатар"
                        },

                        ner_en: {
                            type: "string",
                            description:
                                "Станцын англи нэр",
                            example:
                                "Ulaanbaatar"
                        },

                        aimag: {
                            type: "string",
                            description:
                                "Аймаг эсвэл нийслэл",
                            example:
                                "Нийслэл"
                        },

                        urgurug: {
                            type: "number",
                            format: "double",
                            description:
                                "Өргөрөг",
                            example:
                                47.91845
                        },

                        urtrag: {
                            type: "number",
                            format: "double",
                            description:
                                "Уртраг",
                            example:
                                106.8483
                        },

                        undur: {
                            type: "integer",
                            description:
                                "Далайн түвшнээс дээших өндөр метрээр",
                            example:
                                1303
                        }
                    }
                },


                // ----------------------------------------------
                // CURRENT WEATHER
                // ----------------------------------------------

                CurrentWeather: {
                    type: "object",

                    properties: {

                        id: {
                            type: "integer",
                            example: 1
                        },

                        stants_dugaar: {
                            type: "string",
                            example: "549"
                        },

                        ajiglasan_ognoo: {
                            type: "string",
                            format: "date-time",
                            example:
                                "2026-10-02T01:00:00.000Z"
                        },

                        temperatur_c: {
                            type: "number",
                            format: "double",
                            example: -12.5
                        },

                        medregdeh_c: {
                            type: "number",
                            format: "double",
                            example: -17.2
                        },

                        chigleg_huvi: {
                            type: "integer",
                            example: 65
                        },

                        daralt_hpa: {
                            type: "number",
                            format: "double",
                            example: 1018.4
                        },

                        salhiny_hurd_ms: {
                            type: "number",
                            format: "double",
                            example: 3.2
                        },

                        salhiny_chiglel: {
                            type: "string",
                            example: "NW"
                        },

                        salhiny_delbee_ms: {
                            type: "number",
                            format: "double",
                            example: 6.4
                        },

                        haragts_km: {
                            type: "number",
                            format: "double",
                            example: 10
                        },

                        uulshil_huvi: {
                            type: "number",
                            format: "double",
                            example: 30
                        },

                        tsag_agaar_nohtsol: {
                            type: "string",
                            example: "Цэлмэг"
                        },

                        hur_tunadas_mm: {
                            type: "number",
                            format: "double",
                            example: 0
                        },

                        uv_index: {
                            type: "number",
                            format: "double",
                            example: 1
                        },

                        shuurdyn_tseg_c: {
                            type: "number",
                            format: "double",
                            example: -18
                        },

                        eh_urvalj: {
                            type: "string",
                            example:
                                "weather.gov.mn"
                        }
                    }
                },


                // ----------------------------------------------
                // FORECAST
                // ----------------------------------------------

                Forecast: {
                    type: "object",

                    properties: {

                        id: {
                            type: "integer",
                            example: 1
                        },

                        stants_dugaar: {
                            type: "string",
                            example: "549"
                        },

                        ognoo: {
                            type: "string",
                            format: "date",
                            example:
                                "2026-10-02"
                        },

                        garig: {
                            type: "string",
                            example:
                                "Баасан"
                        },

                        temperatur_min_c: {
                            type: "number",
                            format: "double",
                            example: -15
                        },

                        temperatur_max_c: {
                            type: "number",
                            format: "double",
                            example: -5
                        },

                        nohtsol: {
                            type: "string",
                            example:
                                "Цэлмэг"
                        },

                        hur_tunadas_magadlalt_huvi: {
                            type: "integer",
                            example: 20
                        },

                        hur_tunadas_mm: {
                            type: "number",
                            format: "double",
                            example: 0
                        },

                        salhiny_hurd_ms: {
                            type: "number",
                            format: "double",
                            example: 4
                        },

                        chigleg_huvi: {
                            type: "integer",
                            example: 40
                        },

                        nar_mandah: {
                            type: "string",
                            example:
                                "07:12:00"
                        },

                        nar_jargah: {
                            type: "string",
                            example:
                                "18:42:00"
                        },

                        eh_urvalj: {
                            type: "string",
                            example:
                                "weather.gov.mn"
                        },

                        hadgalsan_ognoo: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },


                // ----------------------------------------------
                // AIR QUALITY
                // ----------------------------------------------

                AirQuality: {
                    type: "object",

                    properties: {

                        id: {
                            type: "integer",
                            example: 1
                        },

                        stants_dugaar: {
                            type: "string",
                            example: "549"
                        },

                        aqi: {
                            type: "integer",
                            example: 45
                        },

                        angilal: {
                            type: "string",
                            example:
                                "Good"
                        },

                        angilal_mn: {
                            type: "string",
                            example:
                                "Сайн"
                        },

                        pm25: {
                            type: "number",
                            format: "double",
                            example: 12.5
                        },

                        pm10: {
                            type: "number",
                            format: "double",
                            example: 25
                        },

                        no2: {
                            type: "number",
                            format: "double",
                            example: 10
                        },

                        so2: {
                            type: "number",
                            format: "double",
                            example: 5
                        },

                        co: {
                            type: "number",
                            format: "double",
                            example: 0.3
                        },

                        o3: {
                            type: "number",
                            format: "double",
                            example: 20
                        },

                        eruul_mend_zuvlumj: {
                            type: "string",
                            example:
                                "Гадаа удаан хугацаагаар байхгүй байх"
                        },

                        shinechilsen_ognoo: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },


                // ----------------------------------------------
                // WEATHER ALERT
                // ----------------------------------------------

                WeatherAlert: {
                    type: "object",

                    properties: {

                        id: {
                            type: "string",
                            example:
                                "alert-001"
                        },

                        turul: {
                            type: "string",
                            example:
                                "Сэрэмжлүүлэг"
                        },

                        hundrel: {
                            type: "string",
                            example:
                                "Анхаарал"
                        },

                        garchig: {
                            type: "string",
                            example:
                                "Хүчтэй салхи"
                        },

                        tailbar: {
                            type: "string",
                            example:
                                "Зарим газраар хүчтэй салхилна."
                        },

                        nolooloh_bus: {
                            type: "object",
                            nullable: true
                        },

                        ehleh_ognoo: {
                            type: "string",
                            format: "date-time"
                        },

                        duusah_ognoo: {
                            type: "string",
                            format: "date-time"
                        },

                        idevhtei: {
                            type: "boolean",
                            example: true
                        },

                        hadgalsan_ognoo: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },


                // ----------------------------------------------
                // HYDROLOGY
                // ----------------------------------------------

                Hydrology: {
                    type: "object",

                    properties: {

                        id: {
                            type: "string",
                            example: "1"
                        },

                        ner: {
                            type: "string",
                            example:
                                "Туул гол"
                        },

                        usny_tuvshin: {
                            type: "number",
                            example: 125
                        },

                        heviin_tuvshin: {
                            type: "number",
                            example: 110
                        },

                        ueriin_bosgo: {
                            type: "number",
                            example: 180
                        },

                        ursgal_hurd: {
                            type: "number",
                            example: 1.5
                        },

                        usny_temp_c: {
                            type: "number",
                            example: 3.2
                        },

                        tuluv: {
                            type: "string",
                            example:
                                "Хэвийн"
                        },

                        handlaga: {
                            type: "string",
                            example:
                                "Тогтвортой"
                        },

                        shinechilsen_ognoo: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                }
            }
        }
    },

    // Энэ хувилбарт routes доторх @swagger JSDoc заавал хэрэггүй.
    // Swagger endpoint-үүдийг дээрх paths хэсгээс шууд авна.
    apis: []
};


const swaggerSpec =
    swaggerJsdoc(swaggerOptions);


export {
    swaggerSpec,
    swaggerUi
};