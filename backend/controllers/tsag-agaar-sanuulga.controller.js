import {
    getAllTsagAgaarSanuulga,
    getActiveTsagAgaarSanuulga,
    getTsagAgaarSanuulgaById as getTsagAgaarSanuulgaByIdService
} from "../services/tsag-agaar-sanuulga.service.js";

import {
    tsagAgaarSanuulgaLogger
} from "../utils/logger.js";


// =====================================================
// БҮХ САНУУЛГА
//
// GET
// /weather__db/tsag_agaar_sanuulga
//
// GET
// /weather__db/tsag_agaar_sanuulga?active=true
// =====================================================

export async function getTsagAgaarSanuulga(
    req,
    res
) {

    try {

        // =================================================
        // 1. ACTIVE PARAMETER
        // =================================================

        const active =
            req.query.active;


        // =================================================
        // 2. VALIDATION
        // =================================================

        if (
            active !== undefined &&
            active !== "true" &&
            active !== "false"
        ) {

            tsagAgaarSanuulgaLogger.warn(
                `Буруу active параметр: ${active}`
            );

            return res.status(400).json({

                success: false,

                message:
                    "active нь true эсвэл false байх ёстой",

                active:
                    active

            });

        }


        // =================================================
        // 3. SERVICE
        // =================================================

        let data;


        if (active === "true") {

            data =
                await getActiveTsagAgaarSanuulga();

        } else {

            data =
                await getAllTsagAgaarSanuulga();

        }


        // =================================================
        // 4. SUCCESS LOG
        // =================================================

        tsagAgaarSanuulgaLogger.info(
            `Цаг агаарын сануулга амжилттай авлаа: ${data.length} мөр, active=${active ?? "all"}`
        );


        // =================================================
        // 5. RESPONSE
        // =================================================

        res.json({

            success: true,

            database:
                "weather_db",

            table:
                "tsag_agaar_sanuulga",

            active:
                active === "true",

            count:
                data.length,

            data:
                data

        });

    } catch (error) {

        // =================================================
        // 6. ERROR LOG
        // =================================================

        tsagAgaarSanuulgaLogger.error(
            `Цаг агаарын сануулга авах алдаа: ${error.message}`
        );


        console.error(
            "❌ Цаг агаарын сануулга авах алдаа:"
        );

        console.error(error);


        res.status(500).json({

            success: false,

            message:
                "Цаг агаарын сануулга авахад алдаа гарлаа",

            error:
                error.message

        });

    }

}


// =====================================================
// НЭГ САНУУЛГА
//
// GET
// /weather__db/tsag_agaar_sanuulga/:id
// =====================================================

export async function getTsagAgaarSanuulgaById(
    req,
    res
) {

    try {

        // =================================================
        // 1. ID АВАХ
        // =================================================

        const id =
            req.params.id;


        // =================================================
        // 2. REQUIRED VALIDATION
        // =================================================

        if (!id) {

            tsagAgaarSanuulgaLogger.warn(
                "id параметр ирсэнгүй"
            );

            return res.status(400).json({

                success: false,

                message:
                    "id параметр шаардлагатай"

            });

        }


        // =================================================
        // 3. ID LENGTH VALIDATION
        // =================================================

        if (id.length > 50) {

            tsagAgaarSanuulgaLogger.warn(
                `id хэт урт байна: ${id.length} тэмдэгт`
            );

            return res.status(400).json({

                success: false,

                message:
                    "id 50 тэмдэгтээс их байж болохгүй",

                id:
                    id

            });

        }


        // =================================================
        // 4. SERVICE
        // =================================================

        const data =
            await getTsagAgaarSanuulgaByIdService(
                id
            );


        // =================================================
        // 5. DATA БАЙХГҮЙ
        // =================================================

        if (data.length === 0) {

            tsagAgaarSanuulgaLogger.warn(
                `Сануулга олдсонгүй: id=${id}`
            );

            return res.status(404).json({

                success: false,

                message:
                    "Сануулга олдсонгүй",

                id:
                    id

            });

        }


        // =================================================
        // 6. SUCCESS LOG
        // =================================================

        tsagAgaarSanuulgaLogger.info(
            `Сануулга амжилттай авлаа: id=${id}`
        );


        // =================================================
        // 7. RESPONSE
        // =================================================

        res.json({

            success: true,

            database:
                "weather_db",

            table:
                "tsag_agaar_sanuulga",

            id:
                id,

            data:
                data[0]

        });

    } catch (error) {

        // =================================================
        // 8. ERROR LOG
        // =================================================

        tsagAgaarSanuulgaLogger.error(
            `Нэг сануулга авах алдаа: id=${req.params.id}, ${error.message}`
        );


        console.error(
            "❌ Нэг сануулга авах алдаа:"
        );

        console.error(error);


        res.status(500).json({

            success: false,

            message:
                "Сануулга авахад алдаа гарлаа",

            error:
                error.message

        });

    }

}